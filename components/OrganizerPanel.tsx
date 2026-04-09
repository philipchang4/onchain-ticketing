"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";

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
      reset();
      setConfirmCancel(false);
      setShowPriceInput(false);
      setNewPrice("");
    }
  }, [isSuccess, reset]);

  return (
    <div className="glass relative overflow-hidden p-6 border-amber-500/20">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <h2 className="text-sm font-medium text-amber-400 mb-4">
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
          className="btn px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-sm"
        >
          {busy ? "..." : saleActive ? "Pause Sales" : "Resume Sales"}
        </button>

        <button
          onClick={() => setShowPriceInput(!showPriceInput)}
          className="btn px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm"
        >
          Change Price
        </button>

        {confirmCancel ? (
          <div className="flex items-center gap-2">
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
              className="btn px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50"
            >
              Yes, Cancel Event
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="btn px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={busy}
            className="btn px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 text-sm"
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
          className="btn px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 text-sm"
        >
          Withdraw Proceeds
        </button>
      </div>

      {showPriceInput && (
        <div className="flex items-end gap-3 pt-3 border-t border-amber-500/20">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">
              New price (current: {formatUnits(currentPrice, 6)} USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="10"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={() => {
              if (!newPrice) return;
              writeContract({
                address,
                abi: eventTicketAbi,
                functionName: "setPrice",
                args: [parseUnits(newPrice, 6)],
              });
            }}
            disabled={busy || !newPrice}
            className="btn px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-500 disabled:opacity-50"
          >
            {busy ? "..." : "Update"}
          </button>
        </div>
      )}
    </div>
  );
}
