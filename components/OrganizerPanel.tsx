"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther, formatEther } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";
import Link from "next/link";

export function OrganizerPanel({
  address,
  saleActive,
  currentPrice,
}: {
  address: `0x${string}`;
  saleActive: boolean;
  currentPrice: bigint;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [showPriceInput, setShowPriceInput] = useState(false);
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
  const busy = isPending || isConfirming;

  useEffect(() => {
    if (error) {
      toast.error(
        error.message.includes("User rejected")
          ? "Transaction rejected."
          : "Transaction failed."
      );
      reset();
      setConfirmCancel(false);
    }
  }, [error, reset]);

  useEffect(() => {
    if (isSuccess) {
      toast.success("Transaction confirmed!");
      queryClient.invalidateQueries();
      reset();
      setConfirmCancel(false);
      setShowPriceInput(false);
      setNewPrice("");
    }
  }, [isSuccess, reset]);

  return (
    <div className="glass relative overflow-hidden p-6 border-amber-500/20">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <h2 className="text-sm font-medium text-accent-400 mb-4 uppercase tracking-wider">
        Organizer Controls
      </h2>
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() =>
            writeContract({
              address,
              abi: eventTicketAbi,
              functionName: "setSaleActive",
              args: [!saleActive],
            })
          }
          disabled={busy}
          className="btn-press px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:border-accent-500/20 disabled:opacity-50 transition-all duration-200 text-sm"
        >
          {busy ? "..." : saleActive ? "Pause Sales" : "Resume Sales"}
        </button>

        <button
          onClick={() => setShowPriceInput(!showPriceInput)}
          className="btn-press px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:border-accent-500/20 transition-all duration-200 text-sm"
        >
          Change Price
        </button>

        {confirmCancel ? (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-red-400 text-sm">Are you sure?</span>
            <button
              onClick={() =>
                writeContract({
                  address,
                  abi: eventTicketAbi,
                  functionName: "cancelEvent",
                })
              }
              disabled={busy}
              className="btn-press px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50 transition-colors duration-200"
            >
              Yes, Cancel Event
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="btn-press px-3 py-1.5 rounded-lg bg-surface-800 text-surface-300 text-sm hover:bg-surface-700 transition-colors duration-200"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={busy}
            className="btn-press px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all duration-200 text-sm"
          >
            Cancel Event
          </button>
        )}

        <button
          onClick={() =>
            writeContract({
              address,
              abi: eventTicketAbi,
              functionName: "withdrawProceeds",
            })
          }
          disabled={busy}
          className="btn-press px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/15 text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-all duration-200 text-sm"
        >
          Withdraw Proceeds
        </button>

        <Link
          href="/scan"
          className="btn-press px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:border-accent-500/20 transition-all duration-200 text-sm"
        >
          Scan Tickets
        </Link>
      </div>

      {showPriceInput && (
        <div className="flex items-end gap-3 pt-4 border-t border-white/[0.04] animate-fade-in">
          <div className="flex-1">
            <label className="block text-xs text-surface-400 mb-1.5">
              New price (current: {formatEther(currentPrice)} ETH)
            </label>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.001"
              className="input-field !py-2 !text-sm"
            />
          </div>
          <button
            onClick={() => {
              if (!newPrice) return;
              writeContract({
                address,
                abi: eventTicketAbi,
                functionName: "setPrice",
                args: [parseEther(newPrice)],
              });
            }}
            disabled={busy || !newPrice}
            className="btn-primary !py-2 !px-4 !text-sm"
          >
            {busy ? "..." : "Update"}
          </button>
        </div>
      )}
    </div>
  );
}
