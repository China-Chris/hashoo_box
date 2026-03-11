// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ChallengeVerifier} from "../src/ChallengeVerifier.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";
import {Vault} from "../src/Vault.sol";

/// @notice Deploy ChallengeVerifier -> BlindBoxZK -> Vault on HashKey testnet (chain id 133).
/// @dev Set ADMIN_ADDRESS to the multisig/EOA that should own both contracts; defaults to tx.origin.
contract DeployHashKeyTestnet is Script {
    /// HashKey Chain Testnet — https://docs.hsk.xyz
    uint256 public constant HASHKEY_TESTNET_CHAIN_ID = 133;

    function run() external {
        uint256 chainId = block.chainid;
        if (chainId != HASHKEY_TESTNET_CHAIN_ID) {
            console2.log("Warning: chainid is", chainId, "expected", HASHKEY_TESTNET_CHAIN_ID);
        }

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);

        console2.log("Deployer:", deployer);
        console2.log("Admin   :", admin);

        vm.startBroadcast(pk);

        ChallengeVerifier verifier = new ChallengeVerifier();
        console2.log("ChallengeVerifier:", address(verifier));

        BlindBoxZK box = new BlindBoxZK(address(verifier), admin);
        console2.log("BlindBoxZK       :", address(box));

        Vault vault = new Vault(admin);
        console2.log("Vault            :", address(vault));

        vm.stopBroadcast();

        console2.log("--- Next steps ---");
        console2.log("1. BlindBoxZK: admin grants OPERATOR_ROLE to backend relayer:");
        console2.log("   box.grantRole(box.OPERATOR_ROLE(), <operator>)");
        console2.log("2. Vault: fund with native HSK; grant OPERATOR_ROLE for airdrops:");
        console2.log("   vault.grantRole(vault.OPERATOR_ROLE(), <operator>)");
    }
}
