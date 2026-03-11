// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {MockVerifier} from "../src/MockVerifier.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {Vault} from "../src/Vault.sol";

/// @notice Forge-only full flow: mock verify -> submitOpen -> Vault airdrop.
contract IntegrationFlowTest is Test {
    MockVerifier verifier;
    BlindBoxZK box;
    Vault vault;

    address admin = address(this);
    address user = address(0x1111);
    uint256 boxId = 1001;
    uint256 commitment = 12345;

    function setUp() public {
        verifier = new MockVerifier(true);
        box = new BlindBoxZK(address(verifier), admin);
        vault = new Vault(admin);
        box.grantRole(box.OPERATOR_ROLE(), admin);
        vault.grantRole(vault.OPERATOR_ROLE(), admin);
        vm.deal(address(vault), 10 ether);
    }

    function test_submitOpen_then_airdrop() public {
        bytes memory proof = hex"";
        box.submitOpen(boxId, user, proof, commitment);
        assertTrue(box.isOpened(boxId));

        vault.airdrop(user, 1 ether);
        assertEq(user.balance, 1 ether);
    }
}
