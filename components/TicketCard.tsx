"use client";

import { useEffect, useState } from "react";
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";
import QRCode from "qrcode";
import Link from "next/link";

export function TicketCard({
  eventAddress,
  ticketId,
  owner,
}: {
  eventAddress: `0x${string}`;
  ticketId: number;
  owner: `0x${string}`;
}) {
  const [qrSvg, setQrSvg] = useState<string>("");
  const queryClient = useQueryClient();

  const contract = { address: eventAddress, abi: eventTicketAbi } as const;
  const { data } = useReadContracts({
    contracts: [
      { ...contract, functionName: "name" },
      { ...contract, functionName: "venue" },
      { ...contract, functionName: "redeemed", args: [BigInt(ticketId)] },
      { ...contract, functionName: "cancelled" },
    ],
  });

  const eventName = data?.[0]?.result as string | undefined;
  const venue = data?.[1]?.result as string | undefined;
  const redeemed = (data?.[2]?.result as boolean) ?? false;
  const cancelled = (data?.[3]?.result as boolean) ?? false;

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

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
    }
  }, [isSuccess, cancelled, queryClient, reset]);

  useEffect(() => {
    const payload = JSON.stringify({ event: eventAddress, ticketId, owner });
    QRCode.toString(payload, { type: "svg", margin: 1, color: { dark: "#fbbf24", light: "#00000000" } })
      .then(setQrSvg)
      .catch(() => {});
  }, [eventAddress, ticketId, owner]);

  const busy = isPending || isConfirming;

  return (
    <div className="glass relative overflow-hidden p-5 animate-fade-in-up">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/25 to-transparent" />

      <div className="flex gap-4">
        {/* QR Code */}
        <div className="shrink-0 w-24 h-24 rounded-xl bg-surface-900 border border-white/[0.06] flex items-center justify-center overflow-hidden p-1.5">
          {qrSvg ? (
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="w-full h-full" />
          ) : (
            <div className="skeleton w-full h-full" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/event/${eventAddress}`} className="group">
            <h3 className="font-display font-bold text-surface-50 truncate group-hover:text-accent-400 transition-colors duration-200">
              {eventName ?? "..."}
            </h3>
          </Link>
          <p className="text-surface-500 text-sm truncate">{venue ?? "..."}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-surface-300 font-mono text-xs">#{ticketId}</span>
            {redeemed ? (
              <span className="text-[10px] font-medium bg-surface-700 text-surface-400 px-2 py-0.5 rounded-full">
                Redeemed
              </span>
            ) : (
              <span className="text-[10px] font-medium bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/15">
                Valid
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!redeemed && (
        <div className="mt-4 flex gap-2">
          {!cancelled ? (
            <button
              onClick={() =>
                writeContract({
                  address: eventAddress,
                  abi: eventTicketAbi,
                  functionName: "redeemTicket",
                  args: [BigInt(ticketId)],
                })
              }
              disabled={busy}
              className="btn-press flex-1 px-3 py-2 rounded-xl bg-accent-500/10 border border-accent-500/15 text-accent-400 text-sm font-medium hover:bg-accent-500/20 disabled:opacity-50 transition-all duration-200"
            >
              {busy ? "Processing..." : "Check In"}
            </button>
          ) : (
            <button
              onClick={() =>
                writeContract({
                  address: eventAddress,
                  abi: eventTicketAbi,
                  functionName: "claimRefund",
                  args: [BigInt(ticketId)],
                })
              }
              disabled={busy}
              className="btn-press flex-1 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-400 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-all duration-200"
            >
              {busy ? "Processing..." : "Claim Refund"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
