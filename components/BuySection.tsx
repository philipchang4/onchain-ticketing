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
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Purchase</h2>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-white">
          {formatEther(price)}
        </span>
        <span className="text-slate-400">ETH per ticket</span>
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
        className="btn-press w-full rounded-lg bg-brand-600 px-4 py-3.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
