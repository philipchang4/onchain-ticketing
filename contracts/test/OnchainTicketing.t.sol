// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EventTicket} from "../src/EventTicket.sol";
import {TicketFactory} from "../src/TicketFactory.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract OnchainTicketingTest is Test {
    TicketFactory factory;
    EventTicket implementation;
    MockUSDC usdc;

    address owner = address(this);
    address organizer = makeAddr("organizer");
    address buyer1 = makeAddr("buyer1");
    address buyer2 = makeAddr("buyer2");

    uint256 constant CREATION_FEE = 1e6; // 1 USDC
    uint256 constant TICKET_PRICE = 100e6; // 100 USDC (6 decimals)
    uint256 constant MAX_SUPPLY = 100;
    uint256 constant EVENT_DATE = 1_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        implementation = new EventTicket();
        factory = new TicketFactory(address(implementation), CREATION_FEE, IERC20(address(usdc)));

        usdc.mint(organizer, 10_000e6);
        usdc.mint(buyer1, 10_000e6);
        usdc.mint(buyer2, 10_000e6);

        vm.warp(100);
    }

    // ---------------------------------------------------------------
    //  Helpers
    // ---------------------------------------------------------------

    function _createEvent(bool _transferable) internal returns (address) {
        vm.startPrank(organizer);
        usdc.approve(address(factory), CREATION_FEE);
        address eventAddr = factory.createEvent(
            "Test Concert",
            "Madison Square Garden",
            EVENT_DATE,
            TICKET_PRICE,
            MAX_SUPPLY,
            _transferable
        );
        vm.stopPrank();
        return eventAddr;
    }

    function _createSmallEvent(uint256 supply, bool _transferable) internal returns (address) {
        vm.startPrank(organizer);
        usdc.approve(address(factory), CREATION_FEE);
        address eventAddr = factory.createEvent(
            "Small Show",
            "Club",
            EVENT_DATE,
            TICKET_PRICE,
            supply,
            _transferable
        );
        vm.stopPrank();
        return eventAddr;
    }

    function _approveAndBuy(address buyer, EventTicket ticket) internal returns (uint256) {
        vm.startPrank(buyer);
        usdc.approve(address(ticket), TICKET_PRICE);
        uint256 ticketId = ticket.buyTicket();
        vm.stopPrank();
        return ticketId;
    }

    // ---------------------------------------------------------------
    //  Factory – event creation
    // ---------------------------------------------------------------

    function test_CreateEvent() public {
        address eventAddr = _createEvent(false);
        assertTrue(eventAddr != address(0));

        EventTicket ticket = EventTicket(eventAddr);
        assertEq(ticket.name(), "Test Concert");
        assertEq(ticket.venue(), "Madison Square Garden");
        assertEq(ticket.eventDate(), EVENT_DATE);
        assertEq(ticket.price(), TICKET_PRICE);
        assertEq(ticket.maxSupply(), MAX_SUPPLY);
        assertEq(ticket.organizer(), organizer);
        assertEq(address(ticket.paymentToken()), address(usdc));
        assertTrue(ticket.saleActive());
        assertFalse(ticket.cancelled());
        assertFalse(ticket.transferable());
    }

    function test_CreateEvent_NoApproval() public {
        vm.prank(organizer);
        vm.expectRevert();
        factory.createEvent(
            "Test", "Venue", EVENT_DATE, TICKET_PRICE, MAX_SUPPLY, false
        );
    }

    function test_CreateMultipleEvents() public {
        _createEvent(false);
        _createEvent(true);

        assertEq(factory.getEventCount(), 2);
        address[] memory evts = factory.getEvents();
        assertEq(evts.length, 2);
        assertTrue(evts[0] != evts[1]);
    }

    // ---------------------------------------------------------------
    //  Factory – admin
    // ---------------------------------------------------------------

    function test_FactoryOwnerCanSetFee() public {
        factory.setCreationFee(5e6);
        assertEq(factory.creationFee(), 5e6);
    }

    function test_FactoryNonOwnerCannotSetFee() public {
        vm.prank(buyer1);
        vm.expectRevert();
        factory.setCreationFee(5e6);
    }

    function test_FactoryOwnerCanWithdrawFees() public {
        _createEvent(false);

        uint256 balBefore = usdc.balanceOf(owner);
        factory.withdrawFees();
        assertEq(usdc.balanceOf(owner) - balBefore, CREATION_FEE);
    }

    function test_FactoryNonOwnerCannotWithdrawFees() public {
        _createEvent(false);

        vm.prank(buyer1);
        vm.expectRevert();
        factory.withdrawFees();
    }

    function test_FactoryWithdrawFees_NoFees() public {
        vm.expectRevert(TicketFactory.NoFeesToWithdraw.selector);
        factory.withdrawFees();
    }

    // ---------------------------------------------------------------
    //  Ticket purchase – single
    // ---------------------------------------------------------------

    function test_BuyTicket() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        uint256 ticketId = _approveAndBuy(buyer1, ticket);

        assertEq(ticketId, 0);
        assertEq(ticket.ownerOf(0), buyer1);
        assertEq(ticket.totalMinted(), 1);
        assertEq(ticket.balanceOf(buyer1), 1);
        assertEq(usdc.balanceOf(eventAddr), TICKET_PRICE);
    }

    function test_BuyTicket_NoApproval() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert();
        ticket.buyTicket();
    }

    function test_BuyTicket_EventPassed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.warp(EVENT_DATE + 1);

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), TICKET_PRICE);
        vm.expectRevert(EventTicket.EventAlreadyOccurred.selector);
        ticket.buyTicket();
        vm.stopPrank();
    }

    function test_BuyTicket_SalePaused() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.setSaleActive(false);

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), TICKET_PRICE);
        vm.expectRevert(EventTicket.EventNotActive.selector);
        ticket.buyTicket();
        vm.stopPrank();
    }

    function test_BuyTicket_SoldOut() public {
        address eventAddr = _createSmallEvent(2, false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);
        _approveAndBuy(buyer2, ticket);

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), TICKET_PRICE);
        vm.expectRevert(EventTicket.SoldOut.selector);
        ticket.buyTicket();
        vm.stopPrank();
    }

    // ---------------------------------------------------------------
    //  Ticket purchase – batch
    // ---------------------------------------------------------------

    function test_BuyMultipleTickets() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), TICKET_PRICE * 3);
        uint256[] memory ids = ticket.buyTickets(3);
        vm.stopPrank();

        assertEq(ids.length, 3);
        assertEq(ticket.totalMinted(), 3);
        assertEq(ticket.balanceOf(buyer1), 3);
        assertEq(usdc.balanceOf(eventAddr), TICKET_PRICE * 3);
        for (uint256 i = 0; i < 3; i++) {
            assertEq(ticket.ownerOf(i), buyer1);
        }
    }

    function test_BuyMultipleTickets_SoldOut() public {
        address eventAddr = _createSmallEvent(2, false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), TICKET_PRICE * 3);
        vm.expectRevert(EventTicket.SoldOut.selector);
        ticket.buyTickets(3);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------
    //  Transfers
    // ---------------------------------------------------------------

    function test_NonTransferableTicket() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NonTransferable.selector);
        ticket.transferFrom(buyer1, buyer2, 0);
    }

    function test_TransferableTicket() public {
        address eventAddr = _createEvent(true);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        ticket.transferFrom(buyer1, buyer2, 0);

        assertEq(ticket.ownerOf(0), buyer2);
    }

    // ---------------------------------------------------------------
    //  Redemption
    // ---------------------------------------------------------------

    function test_RedeemTicket() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        ticket.redeemTicket(0);

        assertTrue(ticket.redeemed(0));
    }

    function test_RedeemTicket_NotHolder() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer2);
        vm.expectRevert(EventTicket.NotTicketHolder.selector);
        ticket.redeemTicket(0);
    }

    function test_RedeemTicket_AlreadyRedeemed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        ticket.redeemTicket(0);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.AlreadyRedeemed.selector);
        ticket.redeemTicket(0);
    }

    // ---------------------------------------------------------------
    //  Cancellation + refund
    // ---------------------------------------------------------------

    function test_CancelEvent() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.cancelEvent();

        assertTrue(ticket.cancelled());
        assertFalse(ticket.saleActive());
    }

    function test_CancelEvent_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.cancelEvent();
    }

    function test_CancelEvent_AlreadyCancelled() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.cancelEvent();

        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventAlreadyCancelled.selector);
        ticket.cancelEvent();
    }

    function test_CancelEvent_AfterEventDate() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.warp(EVENT_DATE + 1);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventAlreadyOccurred.selector);
        ticket.cancelEvent();
    }

    function test_ClaimRefund() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(organizer);
        ticket.cancelEvent();

        uint256 balBefore = usdc.balanceOf(buyer1);
        vm.prank(buyer1);
        ticket.claimRefund(0);

        assertEq(usdc.balanceOf(buyer1) - balBefore, TICKET_PRICE);
    }

    function test_ClaimRefund_EventNotCancelled() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventNotCancelled.selector);
        ticket.claimRefund(0);
    }

    function test_ClaimRefund_AlreadyRedeemed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        ticket.redeemTicket(0);

        vm.prank(organizer);
        ticket.cancelEvent();

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.AlreadyRedeemed.selector);
        ticket.claimRefund(0);
    }

    // ---------------------------------------------------------------
    //  Withdraw proceeds
    // ---------------------------------------------------------------

    function test_WithdrawProceeds() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.warp(EVENT_DATE + 1);

        uint256 balBefore = usdc.balanceOf(organizer);
        vm.prank(organizer);
        ticket.withdrawProceeds();

        assertEq(usdc.balanceOf(organizer) - balBefore, TICKET_PRICE);
    }

    function test_WithdrawProceeds_BeforeEvent() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventNotOver.selector);
        ticket.withdrawProceeds();
    }

    function test_WithdrawProceeds_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.warp(EVENT_DATE + 1);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.withdrawProceeds();
    }

    function test_WithdrawProceeds_EventCancelled() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(organizer);
        ticket.cancelEvent();

        vm.warp(EVENT_DATE + 1);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventAlreadyCancelled.selector);
        ticket.withdrawProceeds();
    }

    function test_WithdrawProceeds_NoBalance() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.warp(EVENT_DATE + 1);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.NoProceeds.selector);
        ticket.withdrawProceeds();
    }

    // ---------------------------------------------------------------
    //  Sale control
    // ---------------------------------------------------------------

    function test_SetSaleActive() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.setSaleActive(false);
        assertFalse(ticket.saleActive());

        vm.prank(organizer);
        ticket.setSaleActive(true);
        assertTrue(ticket.saleActive());
    }

    function test_SetSaleActive_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.setSaleActive(false);
    }

    // ---------------------------------------------------------------
    //  Price changes
    // ---------------------------------------------------------------

    function test_SetPrice() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.setPrice(200e6);
        assertEq(ticket.price(), 200e6);
    }

    function test_SetPrice_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.setPrice(200e6);
    }

    function test_SetPrice_BuyAtNewPrice() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.setPrice(200e6);

        // Approve old price — transferFrom should fail (insufficient allowance)
        vm.startPrank(buyer1);
        usdc.approve(address(ticket), 100e6);
        vm.expectRevert();
        ticket.buyTicket();
        vm.stopPrank();

        // Approve new price — should succeed
        vm.startPrank(buyer1);
        usdc.approve(address(ticket), 200e6);
        ticket.buyTicket();
        vm.stopPrank();
        assertEq(ticket.ownerOf(0), buyer1);
    }

    // ---------------------------------------------------------------
    //  Organizer redemption (venue check-in)
    // ---------------------------------------------------------------

    function test_RedeemTicketByOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(organizer);
        ticket.redeemTicketByOrganizer(0);

        assertTrue(ticket.redeemed(0));
    }

    function test_RedeemTicketByOrganizer_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.redeemTicketByOrganizer(0);
    }

    function test_RedeemTicketByOrganizer_AlreadyRedeemed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        _approveAndBuy(buyer1, ticket);

        vm.prank(organizer);
        ticket.redeemTicketByOrganizer(0);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.AlreadyRedeemed.selector);
        ticket.redeemTicketByOrganizer(0);
    }
}
