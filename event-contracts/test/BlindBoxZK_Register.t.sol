// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {MockVerifier} from "../src/MockVerifier.sol";

contract BlindBoxZK_RegisterTest is Test {
    BlindBoxZK box;
    address admin = address(this);
    address operator = address(0xBEEF);

    function setUp() public {
        vm.label(operator, "operator");
        box = new BlindBoxZK(address(new MockVerifier(true)), admin);
        box.grantRole(box.OPERATOR_ROLE(), operator);
    }

    function test_register_then_submit_same_commitment() public {
        uint256 boxId = 1;
        uint256 c = 999;
        vm.prank(operator);
        box.registerBox(boxId, c);
        assertEq(box.getRegisteredCommitment(boxId), c);

        vm.prank(operator);
        box.submitOpen(boxId, address(0x1), hex"", c);
        assertTrue(box.isOpened(boxId));
    }

    function test_register_twice_reverts() public {
        vm.startPrank(operator);
        box.registerBox(2, 1);
        vm.expectRevert(BlindBoxZK.AlreadyRegistered.selector);
        box.registerBox(2, 2);
        vm.stopPrank();
    }

    function test_submit_wrong_commitment_reverts() public {
        vm.prank(operator);
        box.registerBox(3, 100);
        vm.prank(operator);
        vm.expectRevert(BlindBoxZK.CommitmentMismatch.selector);
        box.submitOpen(3, address(0x1), hex"", 200);
    }
}
