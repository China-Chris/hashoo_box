// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IVerifier} from "./IVerifier.sol";
import {Groth16Verifier} from "./Groth16Verifier.sol";

/// @notice Adapter that wraps the snarkjs-generated Groth16Verifier to implement IVerifier.
/// The `proof` bytes encode (pA, pB, pC) and `publicInputs` contains the commitment.
contract ChallengeVerifier is IVerifier {
    Groth16Verifier public immutable GROTH16;

    constructor() {
        GROTH16 = new Groth16Verifier();
    }

    /// @notice Decode proof bytes and verify via the Groth16 verifier.
    /// @param proof ABI-encoded (uint256[2] pA, uint256[2][2] pB, uint256[2] pC)
    /// @param publicInputs [commitment]
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool) {
        if (publicInputs.length != 1) return false;

        (
            uint256[2] memory pA,
            uint256[2][2] memory pB,
            uint256[2] memory pC
        ) = abi.decode(proof, (uint256[2], uint256[2][2], uint256[2]));

        uint256[1] memory pubSignals;
        pubSignals[0] = publicInputs[0];

        return GROTH16.verifyProof(pA, pB, pC, pubSignals);
    }
}
