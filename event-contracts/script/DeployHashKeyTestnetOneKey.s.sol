// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ChallengeVerifier} from "../src/ChallengeVerifier.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {Vault} from "../src/Vault.sol";

/**
 * @notice 133 测试网：Deployer = Admin，部署后立刻给 OPERATOR_ADDRESS 授 OPERATOR_ROLE。
 * @dev 只需 .env 里 PRIVATE_KEY（deployer）+ OPERATOR_ADDRESS，不用再换 ADMIN 私钥。
 *
 *   PRIVATE_KEY=0x...deployer
 *   OPERATOR_ADDRESS=0x...backend relayer
 */
contract DeployHashKeyTestnetOneKey is Script {
    uint256 public constant HASHKEY_TESTNET_CHAIN_ID = 133;

    function run() external {
        if (block.chainid != HASHKEY_TESTNET_CHAIN_ID) {
            console2.log("Warning: chainid", block.chainid, "expected", HASHKEY_TESTNET_CHAIN_ID);
        }

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address operator = vm.envAddress("OPERATOR_ADDRESS");

        vm.startBroadcast(pk);

        ChallengeVerifier verifier = new ChallengeVerifier();
        BlindBoxZK box = new BlindBoxZK(address(verifier), deployer);
        Vault vault = new Vault(deployer);

        bytes32 opRole = box.OPERATOR_ROLE();
        box.grantRole(opRole, operator);
        vault.grantRole(vault.OPERATOR_ROLE(), operator);

        vm.stopBroadcast();

        console2.log("ChallengeVerifier:", address(verifier));
        console2.log("BlindBoxZK       :", address(box));
        console2.log("Vault            :", address(vault));
        console2.log("Admin/Deployer   :", deployer);
        console2.log("Operator granted :", operator);
    }
}
