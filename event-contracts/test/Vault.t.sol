// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";

contract VaultTest is Test {
    Vault internal vault;

    address internal admin = address(0xA11CE);
    address internal operator = address(0x0BE4);
    address internal winner = address(0x2222);
    address internal stranger = address(0xBAD);

    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 internal constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    function setUp() public {
        vault = new Vault(admin);
        vm.prank(admin);
        vault.grantRole(OPERATOR_ROLE, operator);
        vm.deal(address(vault), 100 ether);
    }

    function test_admin_can_withdraw() public {
        uint256 before = admin.balance;
        vm.prank(admin);
        vault.withdraw(admin, 10 ether);
        assertEq(admin.balance, before + 10 ether);
        assertEq(vault.balance(), 90 ether);
    }

    function test_operator_can_airdrop() public {
        uint256 before = winner.balance;
        vm.prank(operator);
        vault.airdrop(winner, 5 ether);
        assertEq(winner.balance, before + 5 ether);
    }

    function test_non_operator_airdrop_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(Vault.AccessDenied.selector);
        vault.airdrop(winner, 1 ether);
    }

    function test_non_admin_withdraw_reverts() public {
        vm.prank(operator);
        vm.expectRevert(Vault.AccessDenied.selector);
        vault.withdraw(operator, 1 ether);
    }

    function test_airdrop_insufficient_balance_reverts() public {
        vm.prank(admin);
        vault.withdrawAll(admin);
        vm.deal(address(vault), 1 ether);
        vm.prank(operator);
        vm.expectRevert(Vault.InsufficientBalance.selector);
        vault.airdrop(winner, 2 ether);
    }

    function test_batch_airdrop() public {
        address[] memory winners = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        winners[0] = winner;
        winners[1] = address(0x222);
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;

        vm.prank(operator);
        vault.batchAirdrop(winners, amounts);

        assertEq(winner.balance, 1 ether);
        assertEq(address(0x222).balance, 2 ether);
    }

    function test_batch_length_mismatch_reverts() public {
        address[] memory winners = new address[](1);
        uint256[] memory amounts = new uint256[](2);
        winners[0] = winner;
        amounts[0] = 1;
        amounts[1] = 2;
        vm.prank(operator);
        vm.expectRevert(Vault.ArrayLengthMismatch.selector);
        vault.batchAirdrop(winners, amounts);
    }

    function test_receive_deposits_native() public {
        Vault v = new Vault(admin);
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok,) = address(v).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(v.balance(), 1 ether);
    }
}
