// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @notice Prize pool: native token. ADMIN withdraws; OPERATOR can airdrop to winners after blind box open (Q2 C / Q5 C).
contract Vault {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(address => mapping(bytes32 => bool)) internal _roles;

    event Deposited(address indexed sender, uint256 amount);
    event Airdropped(address indexed winner, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    error AccessDenied();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error ArrayLengthMismatch();

    modifier onlyRole(bytes32 role) {
        if (!_roles[msg.sender][role]) revert AccessDenied();
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _roles[admin][ADMIN_ROLE] = true;
        emit RoleGranted(ADMIN_ROLE, admin, admin);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
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

    /// @notice Operator pays winner (after BlindBoxZK open confirmed off-chain or in same tx flow).
    function airdrop(address winner, uint256 amount) external onlyRole(OPERATOR_ROLE) {
        if (winner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok,) = winner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Airdropped(winner, amount);
    }

    function batchAirdrop(address[] calldata winners, uint256[] calldata amounts)
        external
        onlyRole(OPERATOR_ROLE)
    {
        if (winners.length != amounts.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            if (address(this).balance < amounts[i]) revert InsufficientBalance();
            (bool ok,) = winners[i].call{value: amounts[i]}("");
            if (!ok) revert TransferFailed();
            emit Airdropped(winners[i], amounts[i]);
        }
    }

    /// @notice Admin-only withdrawal.
    function withdraw(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount);
    }

    function withdrawAll(address to) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        if (bal == 0) revert ZeroAmount();
        (bool ok,) = to.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, bal);
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}
