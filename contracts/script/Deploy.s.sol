// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EventTicket} from "../src/EventTicket.sol";
import {TicketFactory} from "../src/TicketFactory.sol";

contract Deploy is Script {
    // USDC on Base Sepolia
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 creationFee = vm.envOr("CREATION_FEE", uint256(1e4)); // 0.01 USDC

        vm.startBroadcast(deployerPrivateKey);

        EventTicket impl = new EventTicket();
        TicketFactory factory = new TicketFactory(address(impl), creationFee, IERC20(USDC));

        vm.stopBroadcast();

        console.log("EventTicket implementation:", address(impl));
        console.log("TicketFactory:", address(factory));
    }
}
