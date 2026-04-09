// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title EventTicket
/// @notice Each instance represents a single event. Deployed as a minimal proxy
///         clone by TicketFactory. Tickets are ERC-721 tokens.
contract EventTicket is Initializable, ERC721Upgradeable {
    IERC20 public paymentToken;
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
    error EventAlreadyOccurred();
    error NotTicketHolder();
    error AlreadyRedeemed();
    error EventNotCancelled();
    error NoProceeds();
    error NonTransferable();
    error EventNotOver();
    error PaymentFailed();

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
        address _organizer,
        IERC20 _paymentToken
    ) external initializer {
        __ERC721_init(_name, "TCKT");
        venue = _venue;
        eventDate = _date;
        price = _price;
        maxSupply = _maxSupply;
        transferable = _transferable;
        saleActive = true;
        organizer = _organizer;
        paymentToken = _paymentToken;
    }

    function buyTicket() external returns (uint256 ticketId) {
        if (!saleActive) revert EventNotActive();
        if (cancelled) revert EventAlreadyCancelled();
        if (totalMinted >= maxSupply) revert SoldOut();
        if (block.timestamp >= eventDate) revert EventAlreadyOccurred();

        if (!paymentToken.transferFrom(msg.sender, address(this), price)) revert PaymentFailed();

        ticketId = totalMinted++;
        _safeMint(msg.sender, ticketId);

        emit TicketPurchased(ticketId, msg.sender, price);
    }

    function buyTickets(uint256 quantity) external returns (uint256[] memory ticketIds) {
        if (!saleActive) revert EventNotActive();
        if (cancelled) revert EventAlreadyCancelled();
        if (totalMinted + quantity > maxSupply) revert SoldOut();
        if (block.timestamp >= eventDate) revert EventAlreadyOccurred();

        uint256 totalCost = price * quantity;
        if (!paymentToken.transferFrom(msg.sender, address(this), totalCost)) revert PaymentFailed();

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

        if (!paymentToken.transfer(msg.sender, price)) revert PaymentFailed();

        emit RefundClaimed(ticketId, msg.sender, price);
    }

    /// @notice Only callable after the event date and only if the event was not cancelled.
    function withdrawProceeds() external onlyOrganizer {
        if (cancelled) revert EventAlreadyCancelled();
        if (block.timestamp < eventDate) revert EventNotOver();

        uint256 balance = paymentToken.balanceOf(address(this));
        if (balance == 0) revert NoProceeds();

        if (!paymentToken.transfer(organizer, balance)) revert PaymentFailed();

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
