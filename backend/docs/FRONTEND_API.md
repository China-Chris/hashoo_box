# 前端对接接口说明

Base URL：后端地址，例如 `http://localhost:3001`。  
链上需配置：`BLIND_BOX_ADDRESS` 与前端 wagmi `chainId` 一致；EIP-712 的 `verifyingContract` 即该地址。

---

## 1. 健康检查

`GET /health`

```json
{ "ok": true, "chainId": 133, "persistence": "postgres" }
```

---

## 2. 盒列表（筛选已开 / 未开）

`GET /boxes`

| Query      | 说明 |
|------------|------|
| `opened`   | `true` 只返回已开；`false` 只返回未开；不传返回全部 |
| `limit`    | 默认 50，最大 500 |
| `offset`   | 分页偏移，默认 0 |

**200：**

```json
{
  "items": [
    { "boxId": "1", "opened": false, "chainRegistered": true },
    { "boxId": "2", "opened": true, "chainRegistered": true }
  ],
  "total": 20,
  "limit": 50,
  "offset": 0
}
```

- 仅包含**已在后端登记**的盒（mint / register-box 写入 DB 的）。
- Mystery Box 页可用 `opened=false` 拉「仍可开」列表；`opened=true` 拉「已开」记录。

**501**：当前存储未实现 `list`（应使用 Postgres 或带 list 的 memory store）。

---

## 2b. My 页：当前钱包开过的盒

`GET /me/opens?user=0x...`

- 仅在 **POST /boxes/:boxId/open 成功** 后，后端会把 `opened_by`、`open_tx_hash` 写入 DB，此接口才查得到。
- **query `user`**：当前钱包地址，必填。
- **limit / offset**：分页，同 `/boxes`。

**200：**

```json
{
  "items": [
    {
      "boxId": "1",
      "amount": "123",
      "txHash": "0x...",
      "openedAt": "2025-03-10T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

- `txHash`：operator `submitOpen` 交易，可在浏览器打开作为链上证明。
- 前端 My 页已对接：`fetchMyOpens(address)`（`app/lib/mysterybox-api.ts`）。

**501**：存储未实现 `listOpensByUser`。

---

## 3. 盒状态（单盒详情用）

`GET /boxes/:boxId/status`

- **404**：盒未在后端登记（未 mint/未同步）。
- **200**：

```json
{
  "boxId": "123",
  "opened": false,
  "chainRegistered": true,
  "chainCommitment": "333"
}
```

- `opened`：已开盒（DB 或链上已 `submitOpen`）。
- `chainRegistered`：是否已做 3C `registerBox`。
- `chainCommitment`：链上登记的 commitment（字符串，大数）。

前端可据此显示「可开 / 已开 / 未上链登记」等。

---

## 4. 开盒：拿 EIP-712 再签名

`GET /boxes/:boxId/open-typed-data?user=0x...`

- **query `user`**：当前钱包地址，必填。
- **404**：盒不存在。
- **409**：已开。

**200** 返回直接给 `signTypedData`：

```json
{
  "domain": { "name": "BlindBoxOpen", "version": "1", "chainId": 133, "verifyingContract": "0x..." },
  "types": { "OpenIntent": [...] },
  "primaryType": "OpenIntent",
  "message": {
    "boxId": "123",
    "user": "0x...",
    "nonce": "0",
    "deadline": "1730000000"
  }
}
```

前端：

```ts
const data = await fetch(`${API}/boxes/${boxId}/open-typed-data?user=${address}`).then(r => r.json());
const signature = await signTypedData(config, data);
```

---

## 5. 开盒：提交签名，后端代提交链上

`POST /boxes/:boxId/open`

**Body：**

```json
{
  "signature": "0x...",
  "message": {
    "boxId": "123",
    "user": "0x...",
    "nonce": "0",
    "deadline": "1730000000"
  }
}
```

`message` 必须与签名时一致（与 GET 返回的 `message` 对齐）。

**200：**

```json
{ "txHash": "0x...", "boxId": "123" }
```

**4xx**：`Invalid signature` / `Nonce mismatch` / `Already opened` / `Prover not ready` 等，body 里有 `error` 与可选 `detail`。

---

## 6. 登记盒（仅后端/管理端，前端一般不直接调）

`POST /internal/register-box`

**Body：**

```json
{
  "boxId": "123",
  "commitment": "333",
  "saltHex": "0x...",
  "amount": "111",
  "tier": 1,
  "registerOnChain": true
}
```

- 写入 DB；若 `registerOnChain: true` 或环境变量 `REGISTER_ON_CHAIN=1`，会再调链上 `registerBox`（3C）。
- 需要保护（API Key / 内网），不要对公网裸奔。

---

## 7. 前端最小流程小结

1. 列表 + 筛选 → `GET /boxes?opened=false`（或 `true` / 不传）；单盒详情再 `GET /boxes/:id/status`。
2. 用户点「开盒」→ `GET .../open-typed-data?user=...` → `signTypedData` → `POST .../open`。
3. 成功后用 `txHash` 调 explorer 或轮询 `status` 直到 `opened: true`。

**已实现（Next）**：`app/lib/mysterybox-api.ts` 提供 `fetchOpenTypedData` / `postOpen`；`app/hooks/useOpenBox.ts` 串联签名与提交；`BlindBoxCard` 在传入 `chainBoxId` 且配置了 `NEXT_PUBLIC_API_URL` 时走真实开盒；`BlindBoxPagination` 在 API 列表模式下桌面卡片与移动端选号均会调 `openBox(boxId)`。

**链 ID 必须一致**：后端 `CHAIN_ID` 与 EIP-712 `domain.chainId` 一致；前端 wagmi 当前链必须相同，否则签名或校验会失败。若后端是 testnet 133，需在 wagmi 里增加对应 chain 并让用户切链。

---

## 8. CORS

前端 `localhost:3000` 请求后端 `localhost:3001` 为跨域，**必须**在后端启用 CORS，否则浏览器 `fetch` 会报 `TypeError: Failed to fetch`。  
已在 `backend/src/index.ts` 注册 `@fastify/cors`（`origin: true` 开发用；生产建议改为 `CORS_ORIGIN` 白名单）。
