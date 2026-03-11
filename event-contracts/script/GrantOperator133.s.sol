// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {Vault} from "../src/Vault.sol";

/**
 * @notice Admin 给指定地址授予 BlindBoxZK + Vault 的 OPERATOR_ROLE。
 * @dev 必须用 ADMIN 私钥广播（只有 ADMIN 能 grantRole）。
 *
 * 环境变量：
 *   PRIVATE_KEY      — ADMIN 私钥（与部署时 ADMIN_ADDRESS 对应）
 *   BLIND_BOX_ADDRESS — BlindBoxZK 地址
 *   VAULT_ADDRESS    — Vault 地址（可选；不设则只授 BlindBoxZK）
 *   OPERATOR_ADDRESS — 后端 relayer 地址（与 backend OPERATOR_PRIVATE_KEY 对应）
 */
contract GrantOperator133 is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);

        address boxAddr = vm.envAddress("BLIND_BOX_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");

        BlindBoxZK box = BlindBoxZK(payable(boxAddr));
        bytes32 opRole = box.OPERATOR_ROLE();

        console2.log("Admin (broadcast):", admin);
        console2.log("BlindBoxZK       :", boxAddr);
        console2.log("Operator grant to:", operator);

        vm.startBroadcast(pk);

        box.grantRole(opRole, operator);
        console2.log("BlindBoxZK OPERATOR_ROLE granted");

        address vaultAddr = vm.envOr("VAULT_ADDRESS", address(0));
        if (vaultAddr != address(0)) {
            Vault vault = Vault(payable(vaultAddr));
            vault.grantRole(vault.OPERATOR_ROLE(), operator);
            console2.log("Vault OPERATOR_ROLE granted");
        }

        vm.stopBroadcast();

        console2.log("--- backend .env ---");
        console2.log("BLIND_BOX_ADDRESS", boxAddr);
        console2.log("OPERATOR_PRIVATE_KEY must match OPERATOR_ADDRESS");
    }
}
