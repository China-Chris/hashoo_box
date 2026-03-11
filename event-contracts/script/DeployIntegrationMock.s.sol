// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {MockVerifier} from "../src/MockVerifier.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {Vault} from "../src/Vault.sol";

/// @notice Deploy MockVerifier + BlindBoxZK + Vault on local anvil for backend integration (no real ZK).
contract DeployIntegrationMock is Script {
    function run() external {
        // Anvil default account[0] — same key must be used for forge --private-key --broadcast
        uint256 anvilPk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(anvilPk);
        vm.startBroadcast(anvilPk);

        MockVerifier verifier = new MockVerifier(true);
        BlindBoxZK box = new BlindBoxZK(address(verifier), deployer);
        Vault vault = new Vault(deployer);

        bytes32 opRole = box.OPERATOR_ROLE();
        box.grantRole(opRole, deployer);
        vault.grantRole(vault.OPERATOR_ROLE(), deployer);

        vm.stopBroadcast();

        console2.log("MockVerifier:", address(verifier));
        console2.log("BlindBoxZK :", address(box));
        console2.log("Vault      :", address(vault));
        console2.log("Operator   :", deployer);
    }
}
