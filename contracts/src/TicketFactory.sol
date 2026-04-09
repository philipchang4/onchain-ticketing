// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EventTicket} from "./EventTicket.sol";

/// @title TicketFactory
/// @notice Deploys minimal-proxy clones of EventTicket for each new event.
///         The platform charges a one-time creation fee per event.
contract TicketFactory is Ownable {
    using Clones for address;

    address public implementation;
    uint256 public creationFee;
    address[] public events;

    event EventCreated(
        address indexed eventAddress,
        address indexed organizer,
        string name,
        uint256 date,
        uint256 price,
        uint256 maxSupply
    );
    event CreationFeeUpdated(uint256 newFee);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event ImplementationUpdated(address indexed newImplementation);

    error InsufficientCreationFee();
    error NoFeesToWithdraw();
    error TransferFailed();

    constructor(address _implementation, uint256 _creationFee) Ownable(msg.sender) {
        implementation = _implementation;
        creationFee = _creationFee;
    }

    function createEvent(
        string calldata _name,
        string calldata _venue,
        uint256 _date,
        uint256 _price,
        uint256 _maxSupply,
        bool _transferable
    ) external payable returns (address eventAddress) {
        if (msg.value < creationFee) revert InsufficientCreationFee();

        eventAddress = implementation.clone();

        EventTicket(eventAddress).initialize(
            _name,
            _venue,
            _date,
            _price,
            _maxSupply,
            _transferable,
            msg.sender
        );

        events.push(eventAddress);

        emit EventCreated(eventAddress, msg.sender, _name, _date, _price, _maxSupply);
    }

    function getEvents() external view returns (address[] memory) {
        return events;
    }

    function getEventCount() external view returns (uint256) {
        return events.length;
    }

    function setCreationFee(uint256 _newFee) external onlyOwner {
        creationFee = _newFee;
        emit CreationFeeUpdated(_newFee);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFeesToWithdraw();

        (bool success,) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();

        emit FeesWithdrawn(owner(), balance);
    }

    function updateImplementation(address _newImplementation) external onlyOwner {
        implementation = _newImplementation;
        emit ImplementationUpdated(_newImplementation);
    }
}
