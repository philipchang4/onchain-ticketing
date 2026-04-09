// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EventTicket} from "../src/EventTicket.sol";
import {TicketFactory} from "../src/TicketFactory.sol";

contract OnchainTicketingTest is Test {
    TicketFactory factory;
    EventTicket implementation;

    address owner = address(this);
    address organizer = makeAddr("organizer");
    address buyer1 = makeAddr("buyer1");
    address buyer2 = makeAddr("buyer2");

    uint256 constant CREATION_FEE = 0.01 ether;
    uint256 constant TICKET_PRICE = 0.1 ether;
    uint256 constant MAX_SUPPLY = 100;
    uint256 constant EVENT_DATE = 1_000_000;

    function setUp() public {
        implementation = new EventTicket();
        factory = new TicketFactory(address(implementation), CREATION_FEE);

        vm.deal(organizer, 10 ether);
        vm.deal(buyer1, 10 ether);
        vm.deal(buyer2, 10 ether);

        vm.warp(100);
    }

    receive() external payable {}

    // ---------------------------------------------------------------
    //  Helpers
    // ---------------------------------------------------------------

    function _createEvent(bool _transferable) internal returns (address) {
        vm.prank(organizer);
        return factory.createEvent{value: CREATION_FEE}(
            "Test Concert",
            "Madison Square Garden",
            EVENT_DATE,
            TICKET_PRICE,
            MAX_SUPPLY,
            _transferable
        );
    }

    function _createSmallEvent(uint256 supply, bool _transferable) internal returns (address) {
        vm.prank(organizer);
        return factory.createEvent{value: CREATION_FEE}(
            "Small Show",
            "Club",
            EVENT_DATE,
            TICKET_PRICE,
            supply,
            _transferable
        );
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
        assertTrue(ticket.saleActive());
        assertFalse(ticket.cancelled());
        assertFalse(ticket.transferable());
    }

    function test_CreateEvent_InsufficientFee() public {
        vm.prank(organizer);
        vm.expectRevert(TicketFactory.InsufficientCreationFee.selector);
        factory.createEvent{value: 0}(
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
        factory.setCreationFee(0.05 ether);
        assertEq(factory.creationFee(), 0.05 ether);
    }

    function test_FactoryNonOwnerCannotSetFee() public {
        vm.prank(buyer1);
        vm.expectRevert();
        factory.setCreationFee(0.05 ether);
    }

    function test_FactoryOwnerCanWithdrawFees() public {
        _createEvent(false);

        uint256 balBefore = address(owner).balance;
        factory.withdrawFees();
        assertEq(address(owner).balance - balBefore, CREATION_FEE);
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

        vm.prank(buyer1);
        uint256 ticketId = ticket.buyTicket{value: TICKET_PRICE}();

        assertEq(ticketId, 0);
        assertEq(ticket.ownerOf(0), buyer1);
        assertEq(ticket.totalMinted(), 1);
        assertEq(ticket.balanceOf(buyer1), 1);
    }

    function test_BuyTicket_InsufficientPayment() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.InsufficientPayment.selector);
        ticket.buyTicket{value: 0.05 ether}();
    }

    function test_BuyTicket_EventPassed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.warp(EVENT_DATE + 1);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventAlreadyOccurred.selector);
        ticket.buyTicket{value: TICKET_PRICE}();
    }

    function test_BuyTicket_SalePaused() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.setSaleActive(false);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventNotActive.selector);
        ticket.buyTicket{value: TICKET_PRICE}();
    }

    function test_BuyTicket_SoldOut() public {
        address eventAddr = _createSmallEvent(2, false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();
        vm.prank(buyer2);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.SoldOut.selector);
        ticket.buyTicket{value: TICKET_PRICE}();
    }

    // ---------------------------------------------------------------
    //  Ticket purchase – batch
    // ---------------------------------------------------------------

    function test_BuyMultipleTickets() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        uint256[] memory ids = ticket.buyTickets{value: TICKET_PRICE * 3}(3);

        assertEq(ids.length, 3);
        assertEq(ticket.totalMinted(), 3);
        assertEq(ticket.balanceOf(buyer1), 3);
        for (uint256 i = 0; i < 3; i++) {
            assertEq(ticket.ownerOf(i), buyer1);
        }
    }

    function test_BuyMultipleTickets_SoldOut() public {
        address eventAddr = _createSmallEvent(2, false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.SoldOut.selector);
        ticket.buyTickets{value: TICKET_PRICE * 3}(3);
    }

    // ---------------------------------------------------------------
    //  Transfers
    // ---------------------------------------------------------------

    function test_NonTransferableTicket() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NonTransferable.selector);
        ticket.transferFrom(buyer1, buyer2, 0);
    }

    function test_TransferableTicket() public {
        address eventAddr = _createEvent(true);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

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

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(buyer1);
        ticket.redeemTicket(0);

        assertTrue(ticket.redeemed(0));
    }

    function test_RedeemTicket_NotHolder() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(buyer2);
        vm.expectRevert(EventTicket.NotTicketHolder.selector);
        ticket.redeemTicket(0);
    }

    function test_RedeemTicket_AlreadyRedeemed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

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

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(organizer);
        ticket.cancelEvent();

        uint256 balBefore = buyer1.balance;
        vm.prank(buyer1);
        ticket.claimRefund(0);

        assertEq(buyer1.balance - balBefore, TICKET_PRICE);
    }

    function test_ClaimRefund_EventNotCancelled() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventNotCancelled.selector);
        ticket.claimRefund(0);
    }

    function test_ClaimRefund_AlreadyRedeemed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

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

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.warp(EVENT_DATE + 1);

        uint256 balBefore = organizer.balance;
        vm.prank(organizer);
        ticket.withdrawProceeds();

        assertEq(organizer.balance - balBefore, TICKET_PRICE);
    }

    function test_WithdrawProceeds_BeforeEvent() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventNotOver.selector);
        ticket.withdrawProceeds();
    }

    function test_WithdrawProceeds_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.warp(EVENT_DATE + 1);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.withdrawProceeds();
    }

    function test_WithdrawProceeds_EventCancelled() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

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
        ticket.setPrice(0.2 ether);
        assertEq(ticket.price(), 0.2 ether);
    }

    function test_SetPrice_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.setPrice(0.2 ether);
    }

    function test_SetPrice_BuyAtNewPrice() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(organizer);
        ticket.setPrice(0.2 ether);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.InsufficientPayment.selector);
        ticket.buyTicket{value: 0.1 ether}();

        vm.prank(buyer1);
        ticket.buyTicket{value: 0.2 ether}();
        assertEq(ticket.ownerOf(0), buyer1);
    }

    // ---------------------------------------------------------------
    //  Organizer redemption (venue check-in)
    // ---------------------------------------------------------------

    function test_RedeemTicketByOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(organizer);
        ticket.redeemTicketByOrganizer(0);

        assertTrue(ticket.redeemed(0));
    }

    function test_RedeemTicketByOrganizer_NotOrganizer() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.NotOrganizer.selector);
        ticket.redeemTicketByOrganizer(0);
    }

    function test_RedeemTicketByOrganizer_AlreadyRedeemed() public {
        address eventAddr = _createEvent(false);
        EventTicket ticket = EventTicket(eventAddr);

        vm.prank(buyer1);
        ticket.buyTicket{value: TICKET_PRICE}();

        vm.prank(organizer);
        ticket.redeemTicketByOrganizer(0);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.AlreadyRedeemed.selector);
        ticket.redeemTicketByOrganizer(0);
    }
}
