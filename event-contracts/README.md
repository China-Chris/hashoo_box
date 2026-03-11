# Event contracts (BlindBoxZK + Vault)

## Setup

```bash
cd event-contracts
forge install foundry-rs/forge-std   # if lib/forge-std is missing
```

## Test

```bash
cd event-contracts
forge test -vv
```

Uses `test/MockVerifier.sol` so tests do not require real Groth16 proofs.

## Deploy on HashKey testnet

| Network        | Chain ID | RPC                     | Explorer                          |
|----------------|----------|-------------------------|-----------------------------------|
| HashKey Testnet| **133**  | `https://testnet.hsk.xyz` | `https://testnet-explorer.hsk.xyz` |

1. Copy `.env.example` to `.env` and set `PRIVATE_KEY` (deployer must have testnet HSK).
2. Optional: set `ADMIN_ADDRESS` if admin should not be the deployer.

```bash
cd event-contracts
source .env 2>/dev/null || export $(grep -v '^#' .env | xargs)
forge script script/DeployHashKeyTestnet.s.sol:DeployHashKeyTestnet \
  --rpc-url https://testnet.hsk.xyz \
  --broadcast \
  -vvvv
```

3. After deploy, **admin** must grant operator roles:
   - `BlindBoxZK.grantRole(OPERATOR_ROLE, relayer)` — submit open proofs.
   - `Vault.grantRole(OPERATOR_ROLE, relayer)` — airdrop winners.

## Contracts

- `src/BlindBoxZK.sol` — ZK open per `boxId`, operator-only submit.
- `src/Vault.sol` — prize pool; admin withdraws, operator airdrops.
- `src/ChallengeVerifier.sol` — Groth16 adapter implementing `IVerifier` (single public input = commitment).

See `BLIND_BOX_SCHEME.md` for architecture.

## Integration test (MockVerifier + BlindBoxZK + Vault)

Forge:

```bash
forge test --match-contract IntegrationFlow -vv
```

Backend + anvil (from repo root):

```bash
cd backend && npm run test:integration
```

Uses `script/DeployIntegrationMock.s.sol` (anvil default key). Production testnet uses real `ChallengeVerifier` — no MOCK_PROOF.
