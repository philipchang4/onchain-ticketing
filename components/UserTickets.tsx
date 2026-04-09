"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export function UserTickets({
  address,
  tickets,
  cancelled,
}: {
  address: `0x${string}`;
  tickets: { ticketId: number; redeemed: boolean }[];
  cancelled: boolean;
}) {
  const { address: userAddress } = useAccount();
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
  const [showQrFor, setShowQrFor] = useState<number | null>(null);
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
    <div className="glass relative overflow-hidden p-6">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
      <h2 className="text-sm font-medium text-slate-400 mb-4">
        Your Tickets ({tickets.length})
      </h2>
      <div className="space-y-3">
        {tickets.map((t) => {
          const qrPayload = JSON.stringify({
            event: address,
            ticketId: t.ticketId,
            owner: userAddress,
          });

          return (
            <div
              key={t.ticketId}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">
                    Ticket #{t.ticketId}
                  </span>
                  {t.redeemed && (
                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                      Redeemed
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!t.redeemed && (
                    <button
                      onClick={() =>
                        setShowQrFor(showQrFor === t.ticketId ? null : t.ticketId)
                      }
                      className="btn px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                    >
                      {showQrFor === t.ticketId ? "Hide QR" : "Show QR"}
                    </button>
                  )}
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
                      className="btn px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-500 disabled:opacity-50"
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
                      className="btn px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500 disabled:opacity-50"
                    >
                      {busy && actionTicketId === t.ticketId
                        ? "..."
                        : "Claim Refund"}
                    </button>
                  )}
                </div>
              </div>

              {showQrFor === t.ticketId && !t.redeemed && (
                <div className="mt-4 flex flex-col items-center gap-3 animate-scale-in">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG
                      value={qrPayload}
                      size={200}
                      level="H"
                    />
                  </div>
                  <p className="text-slate-500 text-xs text-center max-w-xs">
                    Show this QR code at the venue entrance. Staff will scan it
                    to verify your ticket.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
