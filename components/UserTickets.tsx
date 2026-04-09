"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";

export function UserTickets({
  address,
  tickets,
  cancelled,
}: {
  address: `0x${string}`;
  tickets: { ticketId: number; redeemed: boolean }[];
  cancelled: boolean;
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
  const [actionTicketId, setActionTicketId] = useState<number | null>(null);
  const busy = isPending || isConfirming;

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
      toast.success(cancelled ? "Refund claimed!" : "Ticket checked in!");
      reset();
      setActionTicketId(null);
    }
  }, [isSuccess, cancelled, reset]);

  if (tickets.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Your Tickets ({tickets.length})
      </h2>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div
            key={t.ticketId}
            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
          >
            <div>
              <span className="text-white font-mono text-sm">
                Ticket #{t.ticketId}
              </span>
              {t.redeemed && (
                <span className="ml-2 text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                  Redeemed
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {!t.redeemed && !cancelled && (
                <button
                  onClick={() => {
                    setActionTicketId(t.ticketId);
                    writeContract({
                      address,
                      abi: eventTicketAbi,
                      functionName: "redeemTicket",
                      args: [BigInt(t.ticketId)],
                    });
                  }}
                  disabled={busy && actionTicketId === t.ticketId}
                  className="btn-press px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {busy && actionTicketId === t.ticketId ? "..." : "Check In"}
                </button>
              )}
              {!t.redeemed && cancelled && (
                <button
                  onClick={() => {
                    setActionTicketId(t.ticketId);
                    writeContract({
                      address,
                      abi: eventTicketAbi,
                      functionName: "claimRefund",
                      args: [BigInt(t.ticketId)],
                    });
                  }}
                  disabled={busy && actionTicketId === t.ticketId}
                  className="btn-press px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {busy && actionTicketId === t.ticketId
                    ? "..."
                    : "Claim Refund"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
