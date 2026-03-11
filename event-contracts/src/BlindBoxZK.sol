// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IVerifier} from "./IVerifier.sol";

/// @notice Blind box open: verifies Groth16 proof with single public input = commitment (Q1 B).
///         Only OPERATOR can submit (Q2 C). boxId must not already be opened (Q6 A).
contract BlindBoxZK {
    struct OpenProof {
        bytes proof;
        uint256 commitment;
        uint256 timestamp;
        address user; // opener (for indexer / dispute)
    }

    IVerifier public immutable VERIFIER;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(address => mapping(bytes32 => bool)) internal _roles;

    /// boxId => open record (timestamp != 0 means opened)
    mapping(uint256 => OpenProof) internal _opens;

    event OpenSubmitted(
        address indexed operator,
        uint256 indexed boxId,
        address indexed user,
        uint256 commitment,
        uint256 timestamp
    );
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    error InvalidProof();
    error AlreadyOpened();
    error NotOpened();
    error ZeroAddress();
    error AccessDenied();

    modifier onlyRole(bytes32 role) {
        if (!_roles[msg.sender][role]) revert AccessDenied();
        _;
    }

    constructor(address verifier, address admin) {
        if (verifier == address(0) || admin == address(0)) revert ZeroAddress();
        VERIFIER = IVerifier(verifier);
        _roles[admin][ADMIN_ROLE] = true;
        emit RoleGranted(ADMIN_ROLE, admin, admin);
    }

    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _roles[account][role] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _roles[account][role] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[account][role];
    }

    /// @notice Operator submits open for boxId; proof must verify with publicInputs[0] == commitment.
    /// @param user Opener address (for event; backend binds EIP-712 off-chain).
    function submitOpen(uint256 boxId, address user, bytes calldata proof, uint256 commitment)
        external
        onlyRole(OPERATOR_ROLE)
    {
        if (_opens[boxId].timestamp != 0) revert AlreadyOpened();

        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = commitment;
        if (!VERIFIER.verify(proof, publicInputs)) revert InvalidProof();

        _opens[boxId] = OpenProof({
            proof: proof,
            commitment: commitment,
            timestamp: block.timestamp,
            user: user
        });

        emit OpenSubmitted(msg.sender, boxId, user, commitment, block.timestamp);
    }

    function isOpened(uint256 boxId) external view returns (bool) {
        return _opens[boxId].timestamp != 0;
    }

    function getOpen(uint256 boxId)
        external
        view
        returns (bytes memory proof, uint256 commitment, uint256 timestamp, address user)
    {
        OpenProof storage o = _opens[boxId];
        if (o.timestamp == 0) revert NotOpened();
        return (o.proof, o.commitment, o.timestamp, o.user);
    }
}
