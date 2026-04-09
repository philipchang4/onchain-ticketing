// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EventTicket} from "../src/EventTicket.sol";
import {TicketFactory} from "../src/TicketFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 creationFee = vm.envOr("CREATION_FEE", uint256(0.001 ether));

        vm.startBroadcast(deployerPrivateKey);

        EventTicket impl = new EventTicket();
        TicketFactory factory = new TicketFactory(address(impl), creationFee);

        vm.stopBroadcast();

        console.log("EventTicket implementation:", address(impl));
        console.log("TicketFactory:", address(factory));
    }
}
