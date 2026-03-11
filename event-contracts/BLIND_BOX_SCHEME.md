# 盲盒合约方案说明

本文档固化当前已确认的架构选择，便于实现合约、后端与前端时对齐。

---

## 一、已确认的决策摘要

| 项 | 选择 | 含义 |
|----|------|------|
| **Q1** | **B** | 链上 **public 只放 commitment**，不把金额、档位、盐明文作为 public input。 |
| **Q2** | **C** | **用户签名 + 后端代提交**：用户用钱包签授权/意图，**operator** 调链上提交 proof / 改状态（可代付 gas）。 |
| **Q3** | **C** | **两个合约**：金库（Vault）与 ZK/盲盒逻辑（BlindBoxZK）分离部署。 |
| **Q4** | **C** | **Open 强依赖后端**：用户开盒前必须请求后端拿到组 proof 所需数据（含盐），链上只验 proof + 更新状态。 |
| **Q5** | **C** | **AccessControl**：`admin` + `operator`，日常上链操作由 operator，配置/升级/提款由 admin。 |
| **Q6** | **A** | **每盒唯一盐**，**开盒成功后该盐作废**，后端不再下发，防重放。 |

**盐的来源**：**链下生成**，在**铸造/上架时**与 amount、档位一并写入后端；链上最多只出现 **commitment**，不出现盐本身。

---

## 二、双合约分工（Q3）

### 1. Vault（金库）

- **实现**：`src/Vault.sol` — `ADMIN_ROLE` 提款；`OPERATOR_ROLE` 可 `airdrop` / `batchAirdrop` 给赢家（对应方案 A：开盒验证后由 operator 按后端指令发奖）。
- **职责**：持有奖池资产（如原生币或 ERC20）、管理员提款、紧急暂停等。
- **复用**：与现有 `Airdrop.sol` 同类——`receive`/存款、`withdraw`、所有权/角色。
- **与 ZK 合约关系**（需二选一并在实现里写死）：
  - **A**：ZK 合约仅记录「已开盒/已验证」，**发奖仍由 Vault 的 admin/operator 按事件或后端指令调用** `airdrop(winner, amount)`；或
  - **B**：Vault **授权** BlindBoxZK 在一定额度内划转，开盒验证通过后由 BlindBoxZK 调 Vault 转出（更自动化，授权模型要设计好）。

### 2. BlindBoxZK（盲盒 + ZK）

- **实现**：`src/BlindBoxZK.sol` — `submitOpen(boxId, user, proof, commitment)` 仅 `OPERATOR_ROLE`；单 public input = commitment；`boxId` 已开则 `AlreadyOpened`。
- **职责**：
  - 绑定 `IVerifier`，对 **commitment + proof** 做校验（与现有 `ZKChallenge` 类似，但可扩展为按 `boxId` 防重放）。
  - 记录 `boxId`（或 roundId）是否已提交有效 proof / 是否已开，并发事件供后端索引。
- **复用**：`IVerifier` 接口、`ZKChallenge` 的「存 proof + commitment + 时间戳」模式；**Groth16Verifier / ChallengeVerifier 需随新电路重生成**（public 仍为 commitment 时，可保持单 public，改动面相对小）。

---

## 三、链上 vs 链下

| 数据 | 链上 | 链下（后端） |
|------|------|----------------|
| **盐** | ❌ 不存储、不 public | ✅ 每盒唯一，铸造时生成，open 时短暂给出，用后作废 |
| **金额 / 档位** | ❌ 不作为 public（Q1 B） | ✅ 与盐一起存，open 时用于组 witness |
| **commitment** | ✅ 作为电路 public input，合约只验 `verify(proof, [commitment, …])` | ✅ 与盐、amount、tier 用同一套规则计算，保证和电路一致 |
| **boxId / 用户** | ✅ 可做 mapping 防重复开盒 + 事件 | ✅ 业务主数据、列表展示 |
| **用户授权** | 可选：验签在链下，链上只信 operator | ✅ EIP-712 签名，后端验签后再代提交 |

---

## 四、盐的生命周期（Q6 A + 链下生成）

1. **铸造/上架（链下）**  
   - 为每个 `boxId` 生成高熵随机 **salt**。  
   - 确定 **amount、tier**（或按规则生成）。  
   - 按电路约定计算 **commitment**（例如对 `(amount, tier, salt, …)` 的 hash，以电路为准）。  
   - 写入 DB：`opened = false`，盐仅存在后端。

2. **可选链上步骤**  
   - 仅写入 **boxId + commitment**（或发事件），便于索引；**不写盐**。

3. **用户 Open（Q4 C）**  
   - 前端请求后端：`open(boxId, userAddress, …)`。  
   - 后端校验未开、未售，**取出该盒 salt + amount + tier**，在受控环境内组 **witness**，生成 **proof**；同一请求内可将该盒标记为处理中，避免并发双开。

4. **链上提交（Q2 C）**  
   - 用户先对结构化数据签名（见下节），后端验签。  
   - **operator** 调用 BlindBoxZK：`submitOpen(boxId, proof, commitment, …)`（具体签名以合约为准）。  
   - 合约 `IVerifier.verify(proof, publicInputs)` 通过后，标记该 `boxId` 已开，并 `emit` 事件。

5. **作废**  
   - 链上既已确认或业务上开盒完成，后端 **opened = true**，**该盐永不再次下发**。

---

## 五、用户签名 + 后端代提交（Q2 C）

- **目的**：链上交易由 operator 发起，但**绑定用户意图**，防止 operator 任意代开别人的盒。
- **建议**：**EIP-712** 结构化签名，域里包含链 id、合约地址；消息里至少包含：
  - `boxId`
  - `user`（用户地址）
  - `nonce`（每用户递增，防重放）
  - `deadline`（过期拒绝）
- **流程**：用户签名 → 后端验签 → operator 带签名或后端仅内部校验后提交（若签名只用于后端鉴权，也可不在链上验签，由你们信任模型决定）。

---

## 六、角色（Q5 C）

| 角色 | 典型权限 |
|------|----------|
| **admin** | 暂停、换 Verifier 地址、Vault 提款、grant/revoke 角色 |
| **operator** | 调用 `submitOpen`、批量登记等与开盒相关的状态更新；**不**默认拥有 Vault 全部提款权 |

operator 私钥若跑在后端，需 **rotation、限权、审计**。

---

## 七、与现有代码的对应

| 现有文件 | 在本方案中的位置 |
|----------|------------------|
| `Airdrop.sol` | Vault 的管理/提款/批量发放逻辑可参考 |
| `ZKChallenge.sol` | BlindBoxZK 的「按 id 存 proof + commitment + 时间戳」可参考；**submit 建议改为 onlyOperator 或带用户绑定** |
| `IVerifier.sol` | 保留；新电路对应新 Adapter + 新 `Groth16Verifier` |
| `ChallengeVerifier.sol` / `Groth16Verifier.sol` | 随电路 public 个数重生成；Q1 B 下仍可能是单 public = commitment |

---

## 八、实现顺序建议

1. 冻结电路 public 布局（至少 commitment；可选 boxId）。  
2. 生成新 Verifier 合约 + Adapter。  
3. 实现 BlindBoxZK（operator 提交 + 防重放）。  
4. 实现或改造 Vault，与 BlindBoxZK 的资金流对齐。  
5. 后端：铸造写库、open 接口、签名验签、operator 调链。  
6. 前端：open 走后端，展示链上事件或后端同步状态。

---

## 九、一句话总结

- **链上**：只信 **commitment + proof**，记 **box 已开**；金库单独管钱。  
- **链下**：**盐在铸造时生成并入库**，open 时经后端取出组 proof，用后作废；**用户签名 + operator 代提交**；**admin / operator 分权**。

如需把某一条改成「链上也存 commitment 的注册表」，可在 BlindBoxZK 增加 `registerBox(boxId, commitment)`（onlyOperator），与后端 DB 双写或以后端为准再同步。
