// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ChallengeVerifier_Real} from "../src/ChallengeVerifier_Real.sol";
import {BlindBoxZK} from "../src/BlindBoxZK.sol";

/// @notice Deploy BlindBoxZK bound to ChallengeVerifier_Real (must rebuild Groth16Verifier_Real.sol from circuits/build-real-zk.sh first).
contract DeployRealZK is Script {
    function run() external {
        uint256 anvilPk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(anvilPk);
        vm.startBroadcast(anvilPk);

        ChallengeVerifier_Real verifier = new ChallengeVerifier_Real();
        BlindBoxZK box = new BlindBoxZK(address(verifier), deployer);
        box.grantRole(box.OPERATOR_ROLE(), deployer);

        vm.stopBroadcast();
        console2.log("ChallengeVerifier_Real:", address(verifier));
        console2.log("BlindBoxZK           :", address(box));
    }
}
