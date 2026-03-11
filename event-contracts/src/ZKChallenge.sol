// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IVerifier} from "./IVerifier.sol";

contract ZKChallenge {
    struct RoundProof {
        bytes proof;
        uint256 commitment;
        uint256 timestamp;
    }

    IVerifier public immutable VERIFIER;

    /// roundId => round proof submitted by admin
    mapping(uint256 => RoundProof) internal _rounds;

    event ProofSubmitted(address indexed submitter, uint256 indexed roundId, uint256 commitment);

    error InvalidProof();
    error AlreadySubmitted();
    error NoSubmission();
    error ZeroAddress();

    constructor(address verifier) {
        if (verifier == address(0)) revert ZeroAddress();
        VERIFIER = IVerifier(verifier);
    }

    /// @notice Submit a ZK proof for a round. Proves the commitment is valid.
    function submitProof(uint256 roundId, bytes calldata proof, uint256 commitment) external {
        if (_rounds[roundId].timestamp != 0) revert AlreadySubmitted();

        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = commitment;
        bool valid = VERIFIER.verify(proof, publicInputs);
        if (!valid) revert InvalidProof();

        _rounds[roundId] = RoundProof({proof: proof, commitment: commitment, timestamp: block.timestamp});

        emit ProofSubmitted(msg.sender, roundId, commitment);
    }

    /// @notice Re-verify the stored proof for a round.
    function verifyRound(uint256 roundId) external view returns (bool) {
        RoundProof storage r = _rounds[roundId];
        if (r.timestamp == 0) revert NoSubmission();

        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = r.commitment;
        return VERIFIER.verify(r.proof, publicInputs);
    }

    function getRound(uint256 roundId)
        external
        view
        returns (bytes memory proof, uint256 commitment, uint256 timestamp)
    {
        RoundProof storage r = _rounds[roundId];
        if (r.timestamp == 0) revert NoSubmission();
        return (r.proof, r.commitment, r.timestamp);
    }
}
