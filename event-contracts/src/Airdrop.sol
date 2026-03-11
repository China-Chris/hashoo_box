// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Airdrop {
    address public owner;

    event Airdropped(address indexed winner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    error OnlyOwner();
    error ArrayLengthMismatch();
    error TransferFailed();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function airdrop(address winner, uint256 amount) external onlyOwner {
        if (winner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok,) = winner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Airdropped(winner, amount);
    }

    function batchAirdrop(address[] calldata winners, uint256[] calldata amounts) external onlyOwner {
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

    function withdraw(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok,) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, amount);
    }

    function withdrawAll() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal == 0) revert ZeroAmount();
        (bool ok,) = owner.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, bal);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}
