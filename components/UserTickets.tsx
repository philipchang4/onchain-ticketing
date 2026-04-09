"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";

export function UserTickets({
  address,
  tickets,
  cancelled,
}: {
  address: `0x${string}`;
  tickets: { ticketId: number; redeemed: boolean; holderName?: string }[];
  cancelled: boolean;
}) {
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
      queryClient.invalidateQueries();
      reset();
      setActionTicketId(null);
    }
  }, [isSuccess, cancelled, queryClient, reset]);

  if (tickets.length === 0) return null;

  return (
    <div className="glass relative overflow-hidden p-6">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/25 to-transparent" />
      <h2 className="text-sm font-medium text-surface-400 mb-4 uppercase tracking-wider">
        Your Tickets ({tickets.length})
      </h2>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div
            key={t.ticketId}
            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
          >
            <div className="flex items-center gap-2">
              <span className="text-surface-50 font-mono text-sm">
                #{t.ticketId}
              </span>
              {t.holderName && (
                <span className="text-surface-300 text-sm truncate max-w-[120px]">
                  {t.holderName}
                </span>
              )}
              {t.redeemed ? (
                <span className="text-[10px] font-medium bg-surface-700 text-surface-400 px-2 py-0.5 rounded-full">
                  Redeemed
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/15">
                  Valid
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
                  className="btn-press px-3 py-1.5 rounded-lg bg-accent-500/10 border border-accent-500/15 text-accent-400 text-sm font-medium hover:bg-accent-500/20 disabled:opacity-50 transition-all duration-200"
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
                  className="btn-press px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-400 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-all duration-200"
                >
                  {busy && actionTicketId === t.ticketId ? "..." : "Claim Refund"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
