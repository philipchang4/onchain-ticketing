"use client";

import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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
      toast.success("Ticket purchased!");
      reset();
    }
  }, [isSuccess, reset]);

  return (
    <div className="glass relative overflow-hidden p-6">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/25 to-transparent" />

      <h2 className="text-sm font-medium text-surface-400 mb-3 uppercase tracking-wider">
        Purchase
      </h2>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="font-display text-4xl font-bold text-surface-50">
          {formatEther(price)}
        </span>
        <span className="text-surface-500 text-sm">ETH / ticket</span>
      </div>

      <button
        onClick={() =>
          writeContract({
            address,
            abi: eventTicketAbi,
            functionName: "buyTicket",
            value: price,
          })
        }
        disabled={!canBuy || isPending || isConfirming}
        className="btn-primary w-full"
      >
        {isPending
          ? "Confirm in Wallet..."
          : isConfirming
            ? "Confirming..."
            : cancelled
              ? "Event Cancelled"
              : !saleActive
                ? "Sales Paused"
                : remaining <= 0
                  ? "Sold Out"
                  : eventPassed
                    ? "Event Passed"
                    : "Buy Ticket"}
      </button>
    </div>
  );
}
