# 重新部署合约 → 再启动后端

## 两条路线

### A. HashKey 测试网 133（与当前前端默认 133 一致）

1. **准备 `event-contracts/.env`**
   - `PRIVATE_KEY=` 有测试 HSK 的部署账号
   - 可选 `ADMIN_ADDRESS=`（不写则用 deployer 当 admin）

2. **部署**
   ```bash
   cd event-contracts
   bash scripts/deploy-testnet-133.sh
   ```
   脚本会广播部署并打印 `BlindBoxZK` / `Vault` 地址。

3. **授权 operator（必须）**  
   `DeployHashKeyTestnet` **不会**自动 grant OPERATOR。  
   **推荐一键脚本**：见 **`backend/docs/OPERATOR_ROLE.md`** 与 `event-contracts/scripts/grant-operator-133.sh`。  
   手动用 **admin 私钥** 执行：
   ```bash
   cast send <BLIND_BOX_ADDRESS> "grantRole(bytes32,address)" \
     $(cast keccak "OPERATOR_ROLE") <OPERATOR_EOA> \
     --rpc-url https://testnet.hsk.xyz --private-key <ADMIN_PRIVATE_KEY>
   ```
   `<OPERATOR_EOA>` 必须与 `backend/.env` 里 `OPERATOR_PRIVATE_KEY` 对应地址一致。

4. **写 `backend/.env`**
   ```env
   RPC_URL=https://testnet.hsk.xyz
   CHAIN_ID=133
   BLIND_BOX_ADDRESS=<上一步控制台/jq 输出的地址>
   OPERATOR_PRIVATE_KEY=<operator 私钥>
   ```
   该脚本部署的是 **ChallengeVerifier**，不是 Mock；要 `submitOpen` 需 **真 ZK**（`CIRCUIT_WASM_PATH` / `CIRCUIT_ZKEY_PATH`）且与合约 verifier 匹配，否则用 **路线 B** 本地 Mock。

---

### B. 本地 anvil + Mock（最快联调前后端）

1. **一键部署并打印 backend 环境**
   ```bash
   cd event-contracts
   bash scripts/deploy-anvil-mock.sh
   ```
   会起 anvil、部署 Mock 栈，并打印一段可直接贴进 `backend/.env` 的内容（含 `MOCK_PROOF=1`、`CHAIN_ID=31337`）。

2. **另开终端启动后端**
   ```bash
   cd backend
   # 把上一步输出写入 .env（或手动合并）
   npm run dev
   ```

3. **前端**  
   当前 wagmi 默认 133；要联 anvil 需在 `app/config/wagmi.ts` 里加 **chain 31337** 并切链，或把后端改为 133 仅当合约在 133 上时。

---

## 启动后端

```bash
cd backend
npm run dev
```

成功日志：`BlindBox backend http://0.0.0.0:3001`  
健康检查：`curl http://localhost:3001/health`
