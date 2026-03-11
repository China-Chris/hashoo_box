// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IVerifier} from "./IVerifier.sol";

// After running circuits/build-real-zk.sh, snarkjs writes Groth16Verifier_Real.sol.
// That file must define a contract with verifyProof(uint[2],uint[2][2],uint[2],uint[1]) external view returns (bool).
// If snarkjs names it "Verifier", rename to Groth16VerifierReal or change import below.
import {Groth16VerifierReal} from "./Groth16Verifier_Real.sol";

/// @notice Same adapter as ChallengeVerifier but bound to circuit built from commit_open.circom.
contract ChallengeVerifier_Real is IVerifier {
    Groth16VerifierReal public immutable GROTH16;

    constructor() {
        GROTH16 = new Groth16VerifierReal();
    }

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
