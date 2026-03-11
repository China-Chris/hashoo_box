// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ChallengeVerifier_Real} from "../src/ChallengeVerifier_Real.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {Vault} from "../src/Vault.sol";

/**
 * @notice 133：与 DeployHashKeyTestnetOneKey 相同流程，但 Verifier 换为 ChallengeVerifier_Real
 *         （Groth16Verifier_Real 须由 circuits/build-real-zk.sh 从 commit_open_final.zkey 生成）。
 *         后端 prover 使用同一套 wasm+zkey 时，submitOpen 才会通过，不再 InvalidProof。
 *
 *   cd event-contracts && forge script script/DeployHashKeyTestnetOneKeyRealZK.s.sol --rpc-url $RPC_URL --broadcast
 *
 *   PRIVATE_KEY=0x...deployer
 *   OPERATOR_ADDRESS=0x...backend relayer
 */
contract DeployHashKeyTestnetOneKeyRealZK is Script {
    uint256 public constant HASHKEY_TESTNET_CHAIN_ID = 133;

    function run() external {
        if (block.chainid != HASHKEY_TESTNET_CHAIN_ID) {
            console2.log("Warning: chainid", block.chainid, "expected", HASHKEY_TESTNET_CHAIN_ID);
        }

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address operator = vm.envAddress("OPERATOR_ADDRESS");

        vm.startBroadcast(pk);

        ChallengeVerifier_Real verifier = new ChallengeVerifier_Real();
        BlindBoxZK box = new BlindBoxZK(address(verifier), deployer);
        Vault vault = new Vault(deployer);

        bytes32 opRole = box.OPERATOR_ROLE();
        box.grantRole(opRole, operator);
        vault.grantRole(vault.OPERATOR_ROLE(), operator);

        vm.stopBroadcast();

        console2.log("ChallengeVerifier_Real:", address(verifier));
        console2.log("BlindBoxZK            :", address(box));
        console2.log("Vault                 :", address(vault));
        console2.log("Admin/Deployer        :", deployer);
        console2.log("Operator granted      :", operator);
    }
}
