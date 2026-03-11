# Real ZK circuit (commit_open)

与链上 **ChallengeVerifier** 相同接口：`proof` = `abi.encode(pA,pB,pC)`，`publicInputs[0]` = commitment。

## 语义（当前最小电路）

- **私有输入**：`salt`, `amount`（field 元素，十进制字符串传入 witness）
- **公开输出**：`commitment = salt + amount`（mod r）
- 铸造/上架时：`commitment` 必须按同一公式计算并入库；open 时用相同 `salt`、`amount` 生成 proof。

后续可换成 Poseidon/hash，需重新 setup 并替换 `Groth16Verifier_Real.sol`。

## 构建（生成 wasm + zkey + Solidity Verifier）

```bash
cd event-contracts/circuits
chmod +x build-real-zk.sh
./build-real-zk.sh
```

依赖：`circom`、`snarkjs`、Node；首次会下载 `pot12_final.ptau`。

产物：

- `build/commit_open.wasm`（或 `build/commit_open_js/commit_open.wasm`，以 circom 实际输出为准）
- `build/commit_open_final.zkey`
- `../src/Groth16Verifier_Real.sol`（覆盖占位；合约名需为 `Groth16VerifierReal`，若 snarkjs 导出为 `Verifier` 请手动改名或改 `ChallengeVerifier_Real` 的 import）

然后：

```bash
cd ../..
forge build
forge script script/DeployRealZK.s.sol:DeployRealZK --rpc-url http://127.0.0.1:8545 --broadcast
```

后端 `.env`：

```env
MOCK_PROOF=0
CIRCUIT_WASM_PATH=.../event-contracts/circuits/build/commit_open.wasm
CIRCUIT_ZKEY_PATH=.../event-contracts/circuits/build/commit_open_final.zkey
BLIND_BOX_ADDRESS=<DeployRealZK 输出的 BlindBoxZK>
```

## 与测试网旧部署的关系

HashKey 测试网上已部署的 BlindBoxZK 绑定的是**旧** `Groth16Verifier`，**不能**用本电路的 zkey 出 proof。要真 ZK 上链必须：

- 用本流程重新导出 Verifier + **重新部署** `ChallengeVerifier_Real` + `BlindBoxZK`，或
- 你提供与现网 Verifier 匹配的 zkey/wasm，再把 prover 接到那套 artifact 上。
