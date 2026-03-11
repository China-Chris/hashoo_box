# OPERATOR_ROLE 流程（133 测试网）

后端代用户提交 `submitOpen` / `registerBox` 时，链上要求 **msg.sender 拥有 BlindBoxZK.OPERATOR_ROLE**。  
部署脚本**不会**自动把 deployer 设为 operator（Testnet 脚本只设 admin），所以需要 **ADMIN 显式 grant**。

---

## 角色关系（简要）

| 合约        | 谁需要 OPERATOR_ROLE | 用途 |
|-------------|----------------------|------|
| **BlindBoxZK** | 后端 relayer 地址    | `submitOpen`、`registerBox` |
| **Vault**      | 同上（若要做 airdrop） | `airdrop` / `batchAirdrop` |

**ADMIN_ROLE**：部署时的 `ADMIN_ADDRESS`，只有它能 `grantRole` / `revokeRole`。

**后端 `OPERATOR_PRIVATE_KEY`**：必须是 **已被 grant 了 OPERATOR_ROLE 的地址** 的私钥。

---

## 一键授权（推荐）

在 **`event-contracts`** 目录：

```bash
cd event-contracts

# 1. 设合约地址（你部署 run-latest 里的值）
export BLIND_BOX_ADDRESS=0xb5B17Fc264D28f94A4b87D8d4AF5fCE64ab9b40d
export VAULT_ADDRESS=0x4593106192Cb17eD4301cE544d9670B0425dA53f   # 可选

# 2. 设要授权给谁的地址 = 后端即将使用的 OPERATOR_PRIVATE_KEY 对应地址
export OPERATOR_ADDRESS=0x...   # 例如 anvil[0] 或你们热钱包

# 3. ADMIN 私钥：与部署时一致，写在 .env 的 PRIVATE_KEY，或：
# export PRIVATE_KEY=0x...admin...

bash scripts/grant-operator-133.sh
```

脚本会 **broadcast** 两笔（或一笔，若没设 VAULT）：
- `BlindBoxZK.grantRole(OPERATOR_ROLE, OPERATOR_ADDRESS)`
- `Vault.grantRole(OPERATOR_ROLE, OPERATOR_ADDRESS)`（若设置了 `VAULT_ADDRESS`）

---

## 手动 cast（不用脚本时）

```bash
RPC=https://testnet.hsk.xyz
BOX=0xb5B17Fc264D28f94A4b87D8d4AF5fCE64ab9b40d
OP=0x...        # operator 地址
ADMIN_PK=0x...  # admin 私钥

cast send "$BOX" "grantRole(bytes32,address)" \
  $(cast keccak "OPERATOR_ROLE") "$OP" \
  --rpc-url "$RPC" --private-key "$ADMIN_PK"
```

Vault 同理，把 `$BOX` 换成 Vault 地址即可（`OPERATOR_ROLE` 常量名相同）。

---

## 链上核对

```bash
cast call "$BOX" "hasRole(bytes32,address)(bool)" \
  $(cast keccak "OPERATOR_ROLE") "$OP" \
  --rpc-url https://testnet.hsk.xyz
# 应返回 true
```

---

## backend/.env 对齐

授权完成后：

```env
CHAIN_ID=133
RPC_URL=https://testnet.hsk.xyz
BLIND_BOX_ADDRESS=<BlindBoxZK 地址>
OPERATOR_PRIVATE_KEY=<OPERATOR_ADDRESS 的私钥>
```

然后：

```bash
cd backend && npm run dev
```

---

## 相关文件

- 脚本：`event-contracts/script/GrantOperator133.s.sol`
- Shell：`event-contracts/scripts/grant-operator-133.sh`
- 部署：`event-contracts/scripts/deploy-testnet-133.sh`
