// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EventTicket} from "./EventTicket.sol";

/// @title TicketFactory
/// @notice Deploys minimal-proxy clones of EventTicket for each new event.
///         The platform charges a one-time creation fee per event.
contract TicketFactory is Ownable {
    using Clones for address;

    address public implementation;
    IERC20 public paymentToken;
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

    error NoFeesToWithdraw();
    error PaymentFailed();

    constructor(address _implementation, uint256 _creationFee, IERC20 _paymentToken) Ownable(msg.sender) {
        implementation = _implementation;
        creationFee = _creationFee;
        paymentToken = _paymentToken;
    }

    function createEvent(
        string calldata _name,
        string calldata _venue,
        uint256 _date,
        uint256 _price,
        uint256 _maxSupply,
        bool _transferable,
        string calldata _imageUrl
    ) external returns (address eventAddress) {
        if (creationFee > 0) {
            if (!paymentToken.transferFrom(msg.sender, address(this), creationFee)) revert PaymentFailed();
        }

        eventAddress = implementation.clone();

        EventTicket(eventAddress).initialize(
            EventTicket.InitParams({
                name: _name,
                venue: _venue,
                date: _date,
                price: _price,
                maxSupply: _maxSupply,
                transferable: _transferable,
                organizer: msg.sender,
                paymentToken: paymentToken,
                imageUrl: _imageUrl
            })
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
        uint256 balance = paymentToken.balanceOf(address(this));
        if (balance == 0) revert NoFeesToWithdraw();

        if (!paymentToken.transfer(owner(), balance)) revert PaymentFailed();

        emit FeesWithdrawn(owner(), balance);
    }

    function updateImplementation(address _newImplementation) external onlyOwner {
        implementation = _newImplementation;
        emit ImplementationUpdated(_newImplementation);
    }
}
