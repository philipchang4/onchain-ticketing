"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";

export function BuySection({
  address,
  price,
  saleActive,
  cancelled,
  remaining,
  eventPassed,
}: {
  address: `0x${string}`;
  price: bigint;
  saleActive: boolean;
  cancelled: boolean;
  remaining: number;
  eventPassed: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const canBuy = saleActive && !cancelled && remaining > 0 && !eventPassed;
  const maxBuy = Math.min(remaining, 10);
  const totalPrice = price * BigInt(quantity);

  useEffect(() => {
    if (error) {
      toast.error(
        error.message.includes("User rejected")
          ? "Transaction rejected."
          : "Transaction failed."
      );
      reset();
    }
  }, [error, reset]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(
        quantity > 1
          ? `${quantity} tickets purchased!`
          : "Ticket purchased!"
      );
      queryClient.invalidateQueries();
      reset();
      setQuantity(1);
    }
  }, [isSuccess, quantity, queryClient, reset]);

  function handleBuy() {
    if (quantity === 1) {
      writeContract({
        address,
        abi: eventTicketAbi,
        functionName: "buyTicket",
        value: totalPrice,
      });
    } else {
      writeContract({
        address,
        abi: eventTicketAbi,
        functionName: "buyTickets",
        args: [BigInt(quantity)],
        value: totalPrice,
      });
    }
  }

  const statusLabel = cancelled
    ? "Event Cancelled"
    : !saleActive
      ? "Sales Paused"
      : remaining <= 0
        ? "Sold Out"
        : eventPassed
          ? "Event Passed"
          : null;

  return (
    <div className="glass relative overflow-hidden p-6">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/25 to-transparent" />

      <h2 className="text-sm font-medium text-surface-400 mb-3 uppercase tracking-wider">
        Purchase
      </h2>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-4xl font-bold text-surface-50">
          {formatEther(price)}
        </span>
        <span className="text-surface-500 text-sm">ETH / ticket</span>
      </div>

      {canBuy && (
        <>
          {/* Quantity selector */}
          <div className="flex items-center gap-3 my-5">
            <span className="text-surface-400 text-sm">Qty</span>
            <div className="flex items-center rounded-xl border border-white/[0.06] overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-3 py-2 text-surface-300 hover:bg-white/[0.04] disabled:opacity-30 transition-colors duration-150 text-sm"
              >
                -
              </button>
              <span className="px-4 py-2 text-surface-50 font-medium text-sm min-w-[3rem] text-center border-x border-white/[0.06]">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(maxBuy, quantity + 1))}
                disabled={quantity >= maxBuy}
                className="px-3 py-2 text-surface-300 hover:bg-white/[0.04] disabled:opacity-30 transition-colors duration-150 text-sm"
              >
                +
              </button>
            </div>
            {quantity > 1 && (
              <span className="text-surface-500 text-xs">
                {formatEther(price)} x {quantity} = {formatEther(totalPrice)} ETH
              </span>
            )}
          </div>
        </>
      )}

      <button
        onClick={handleBuy}
        disabled={!canBuy || isPending || isConfirming}
        className="btn-primary w-full"
      >
        {isPending
          ? "Confirm in Wallet..."
          : isConfirming
            ? "Confirming..."
            : statusLabel
              ? statusLabel
              : quantity > 1
                ? `Buy ${quantity} Tickets`
                : "Buy Ticket"}
      </button>
    </div>
  );
}
