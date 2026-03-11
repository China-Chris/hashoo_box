// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {MockVerifier} from "./MockVerifier.sol";

contract BlindBoxZKTest is Test {
    BlindBoxZK internal box;
    MockVerifier internal verifier;

    address internal admin = address(0xA11CE);
    address internal operator = address(0x0BE4);
    address internal user = address(0x1111);
    address internal stranger = address(0xBAD);

    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 internal constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    function setUp() public {
        verifier = new MockVerifier(true);
        box = new BlindBoxZK(address(verifier), admin);
        vm.prank(admin);
        box.grantRole(OPERATOR_ROLE, operator);
    }

    function test_admin_has_admin_role() public view {
        assertTrue(box.hasRole(ADMIN_ROLE, admin));
        assertFalse(box.hasRole(OPERATOR_ROLE, admin));
    }

    function test_operator_can_submit_open() public {
        uint256 boxId = 1;
        bytes memory proof = hex"00";
        uint256 commitment = 12345;

        vm.prank(operator);
        box.submitOpen(boxId, user, proof, commitment);

        assertTrue(box.isOpened(boxId));
        (bytes memory p, uint256 c, uint256 ts, address u) = box.getOpen(boxId);
        assertEq(c, commitment);
        assertEq(u, user);
        assertGt(ts, 0);
        assertEq(p, proof);
    }

    function test_non_operator_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(BlindBoxZK.AccessDenied.selector);
        box.submitOpen(1, user, hex"00", 1);
    }

    function test_double_open_reverts() public {
        uint256 boxId = 42;
        vm.startPrank(operator);
        box.submitOpen(boxId, user, hex"ab", 99);
        vm.expectRevert(BlindBoxZK.AlreadyOpened.selector);
        box.submitOpen(boxId, user, hex"cd", 100);
        vm.stopPrank();
    }

    function test_invalid_proof_reverts() public {
        verifier.setAccept(false);
        vm.prank(operator);
        vm.expectRevert(BlindBoxZK.InvalidProof.selector);
        box.submitOpen(7, user, hex"00", 1);
    }

    function test_get_open_before_open_reverts() public {
        vm.expectRevert(BlindBoxZK.NotOpened.selector);
        box.getOpen(999);
    }

    function test_grant_operator_only_admin() public {
        vm.prank(stranger);
        vm.expectRevert(BlindBoxZK.AccessDenied.selector);
        box.grantRole(OPERATOR_ROLE, stranger);

        vm.prank(admin);
        box.grantRole(OPERATOR_ROLE, stranger);
        assertTrue(box.hasRole(OPERATOR_ROLE, stranger));
    }

    function test_zero_address_constructor_reverts() public {
        vm.expectRevert(BlindBoxZK.ZeroAddress.selector);
        new BlindBoxZK(address(0), admin);
        vm.expectRevert(BlindBoxZK.ZeroAddress.selector);
        new BlindBoxZK(address(verifier), address(0));
    }

    function test_submit_open_records_operator_and_commitment() public {
        uint256 boxId = 5;
        uint256 commitment = 777;
        vm.prank(operator);
        box.submitOpen(boxId, user, hex"01", commitment);
        assertTrue(box.isOpened(boxId));
        (, uint256 c,,) = box.getOpen(boxId);
        assertEq(c, commitment);
    }
}
