// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title EventTicket
/// @notice Each instance represents a single event. Deployed as a minimal proxy
///         clone by TicketFactory. Tickets are ERC-721 tokens.
contract EventTicket is Initializable, ERC721Upgradeable {
    string public venue;
    uint256 public eventDate;
    uint256 public price;
    uint256 public maxSupply;
    uint256 public totalMinted;
    bool public transferable;
    bool public saleActive;
    bool public cancelled;
    address public organizer;

    mapping(uint256 ticketId => bool) public redeemed;

    event TicketPurchased(uint256 indexed ticketId, address indexed buyer, uint256 price);
    event TicketRedeemed(uint256 indexed ticketId, address indexed holder);
    event EventCancelled(address indexed organizer);
    event RefundClaimed(uint256 indexed ticketId, address indexed holder, uint256 amount);
    event ProceedsWithdrawn(address indexed organizer, uint256 amount);
    event SaleStatusChanged(bool active);
    event PriceChanged(uint256 newPrice);

    error NotOrganizer();
    error EventNotActive();
    error EventAlreadyCancelled();
    error SoldOut();
    error InsufficientPayment();
    error EventAlreadyOccurred();
    error NotTicketHolder();
    error AlreadyRedeemed();
    error EventNotCancelled();
    error NoProceeds();
    error NonTransferable();
    error EventNotOver();
    error TransferFailed();

    modifier onlyOrganizer() {
        if (msg.sender != organizer) revert NotOrganizer();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata _name,
        string calldata _venue,
        uint256 _date,
        uint256 _price,
        uint256 _maxSupply,
        bool _transferable,
        address _organizer
    ) external initializer {
        __ERC721_init(_name, "TCKT");
        venue = _venue;
        eventDate = _date;
        price = _price;
        maxSupply = _maxSupply;
        transferable = _transferable;
        saleActive = true;
        organizer = _organizer;
    }

    function buyTicket() external payable returns (uint256 ticketId) {
        if (!saleActive) revert EventNotActive();
        if (cancelled) revert EventAlreadyCancelled();
        if (totalMinted >= maxSupply) revert SoldOut();
        if (msg.value < price) revert InsufficientPayment();
        if (block.timestamp >= eventDate) revert EventAlreadyOccurred();

        ticketId = totalMinted++;
        _safeMint(msg.sender, ticketId);

        emit TicketPurchased(ticketId, msg.sender, msg.value);
    }

    function buyTickets(uint256 quantity) external payable returns (uint256[] memory ticketIds) {
        if (!saleActive) revert EventNotActive();
        if (cancelled) revert EventAlreadyCancelled();
        if (totalMinted + quantity > maxSupply) revert SoldOut();
        if (msg.value < price * quantity) revert InsufficientPayment();
        if (block.timestamp >= eventDate) revert EventAlreadyOccurred();

        ticketIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; i++) {
            uint256 ticketId = totalMinted++;
            _safeMint(msg.sender, ticketId);
            ticketIds[i] = ticketId;
            emit TicketPurchased(ticketId, msg.sender, price);
        }
    }

    function redeemTicket(uint256 ticketId) external {
        if (ownerOf(ticketId) != msg.sender) revert NotTicketHolder();
        if (redeemed[ticketId]) revert AlreadyRedeemed();
        redeemed[ticketId] = true;
        emit TicketRedeemed(ticketId, msg.sender);
    }

    /// @notice Only callable before the event date to guarantee refund funds are available.
    function cancelEvent() external onlyOrganizer {
        if (cancelled) revert EventAlreadyCancelled();
        if (block.timestamp >= eventDate) revert EventAlreadyOccurred();
        cancelled = true;
        saleActive = false;
        emit EventCancelled(msg.sender);
    }

    function claimRefund(uint256 ticketId) external {
        if (ownerOf(ticketId) != msg.sender) revert NotTicketHolder();
        if (!cancelled) revert EventNotCancelled();
        if (redeemed[ticketId]) revert AlreadyRedeemed();

        redeemed[ticketId] = true;
        _burn(ticketId);

        (bool success,) = payable(msg.sender).call{value: price}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(ticketId, msg.sender, price);
    }

    /// @notice Only callable after the event date and only if the event was not cancelled.
    function withdrawProceeds() external onlyOrganizer {
        if (cancelled) revert EventAlreadyCancelled();
        if (block.timestamp < eventDate) revert EventNotOver();

        uint256 balance = address(this).balance;
        if (balance == 0) revert NoProceeds();

        (bool success,) = payable(organizer).call{value: balance}("");
        if (!success) revert TransferFailed();

        emit ProceedsWithdrawn(organizer, balance);
    }

    function setPrice(uint256 _newPrice) external onlyOrganizer {
        price = _newPrice;
        emit PriceChanged(_newPrice);
    }

    function setSaleActive(bool _active) external onlyOrganizer {
        saleActive = _active;
        emit SaleStatusChanged(_active);
    }

    /// @notice Lets the organizer redeem a ticket on behalf of the holder (venue check-in via QR scan).
    function redeemTicketByOrganizer(uint256 ticketId) external onlyOrganizer {
        ownerOf(ticketId); // reverts if token doesn't exist
        if (redeemed[ticketId]) revert AlreadyRedeemed();
        redeemed[ticketId] = true;
        emit TicketRedeemed(ticketId, ownerOf(ticketId));
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && !transferable) {
            revert NonTransferable();
        }
        return super._update(to, tokenId, auth);
    }
}
