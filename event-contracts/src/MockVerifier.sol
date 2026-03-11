// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IVerifier} from "./IVerifier.sol";

/// @notice Integration / test double: no Groth16; accept=true accepts any proof bytes.
contract MockVerifier is IVerifier {
    bool public accept;

    constructor(bool _accept) {
        accept = _accept;
    }

    function setAccept(bool _accept) external {
        accept = _accept;
    }

    function verify(bytes calldata, uint256[] calldata publicInputs) external view returns (bool) {
        if (publicInputs.length != 1) return false;
        return accept;
    }
}
