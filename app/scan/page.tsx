"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

interface TicketData {
  event: `0x${string}`;
  ticketId: number;
  owner: string;
}

function TicketValidator({ data, onReset }: { data: TicketData; onReset: () => void }) {
  const contract = { address: data.event, abi: eventTicketAbi } as const;

  const { data: results, isLoading } = useReadContracts({
    contracts: [
      { ...contract, functionName: "name" },
      { ...contract, functionName: "ownerOf", args: [BigInt(data.ticketId)] },
      { ...contract, functionName: "redeemed", args: [BigInt(data.ticketId)] },
    ],
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset: resetTx,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (error) {
      toast.error(
        error.message.includes("User rejected")
          ? "Transaction rejected."
          : "Redemption failed."
      );
      resetTx();
    }
  }, [error, resetTx]);

  useEffect(() => {
    if (isSuccess) {
      toast.success("Ticket redeemed!");
    }
  }, [isSuccess]);

  if (isLoading) {
    return (
      <div className="glass p-8 text-center">
        <div className="skeleton h-4 w-48 mx-auto" />
        <p className="text-surface-400 mt-4">Verifying ticket onchain...</p>
      </div>
    );
  }

  const eventName = results?.[0]?.result as string | undefined;
  const actualOwner = results?.[1]?.result as string | undefined;
  const isRedeemed = results?.[2]?.result as boolean | undefined;

  const ownerMatches =
    actualOwner?.toLowerCase() === data.owner.toLowerCase();
  const isValid = ownerMatches && !isRedeemed;

  const borderColor = isSuccess
    ? "rgba(34, 197, 94, 0.2)"
    : isValid
      ? "rgba(245, 158, 11, 0.2)"
      : "rgba(239, 68, 68, 0.2)";
  const glowColor = isSuccess
    ? "rgba(34, 197, 94, 0.06)"
    : isValid
      ? "rgba(245, 158, 11, 0.06)"
      : "rgba(239, 68, 68, 0.06)";

  return (
    <div className="animate-fade-in-up space-y-4">
      <div
        className="glass relative overflow-hidden p-6"
        style={{ borderColor, background: glowColor }}
      >
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${borderColor}, transparent)`,
          }}
        />

        <div className="text-center mb-6">
          {isSuccess ? (
            <>
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-500/10 border border-green-500/15 flex items-center justify-center">
                <svg className="text-green-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-green-400">
                Ticket Redeemed
              </h2>
            </>
          ) : isValid ? (
            <>
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent-500/10 border border-accent-500/15 flex items-center justify-center">
                <svg className="text-accent-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-accent-400">
                Valid Ticket
              </h2>
            </>
          ) : (
            <>
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                <svg className="text-red-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-red-400">
                {isRedeemed ? "Already Redeemed" : "Invalid Ticket"}
              </h2>
            </>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-500">Event</span>
            <span className="text-surface-200 font-medium">{eventName ?? "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Ticket ID</span>
            <span className="text-surface-50 font-mono font-medium">#{data.ticketId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Owner</span>
            <span className="text-surface-300 font-mono text-xs">
              {data.owner.slice(0, 6)}...{data.owner.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Ownership</span>
            <span className={ownerMatches ? "text-green-400" : "text-red-400"}>
              {ownerMatches ? "Verified" : "Mismatch"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Status</span>
            <span className={isRedeemed ? "text-red-400" : "text-green-400"}>
              {isRedeemed ? "Already used" : "Unused"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {isValid && !isSuccess && (
          <button
            onClick={() =>
              writeContract({
                address: data.event,
                abi: eventTicketAbi,
                functionName: "redeemTicketByOrganizer",
                args: [BigInt(data.ticketId)],
              })
            }
            disabled={isPending || isConfirming}
            className="btn-primary flex-1"
          >
            {isPending
              ? "Confirm..."
              : isConfirming
                ? "Redeeming..."
                : "Redeem Ticket"}
          </button>
        )}
        <button
          onClick={onReset}
          className="btn-secondary flex-1"
        >
          Scan Another
        </button>
      </div>
    </div>
  );
}

export default function ScanPage() {
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = "qr-reader";

  const handleScan = useCallback((decodedText: string) => {
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.event && parsed.ticketId !== undefined && parsed.owner) {
        setTicketData(parsed as TicketData);
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop();
        }
        setScannerActive(false);
      }
    } catch {
      toast.error("Invalid QR code format.");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  function startScanner() {
    setScannerActive(true);
    setTimeout(() => {
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      ).catch(() => {
        toast.error("Could not access camera. Try manual input instead.");
        setScannerActive(false);
      });
    }, 100);
  }

  function stopScanner() {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop();
    }
    setScannerActive(false);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleScan(manualInput);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16 animate-fade-in">
      <Link
        href="/"
        className="text-surface-500 hover:text-surface-200 text-sm inline-flex items-center gap-1 transition-colors duration-200 mb-6"
      >
        &larr; Back
      </Link>
      <h1 className="font-display text-4xl font-extrabold gradient-text mb-3">
        Scan Tickets
      </h1>
      <p className="text-surface-400 mb-10">
        Scan a ticket QR code to verify ownership and check in attendees.
      </p>

      {ticketData ? (
        <TicketValidator
          data={ticketData}
          onReset={() => setTicketData(null)}
        />
      ) : (
        <div className="space-y-6">
          <div className="glass relative overflow-hidden p-6">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/25 to-transparent" />
            <h2 className="font-display text-lg font-bold text-surface-50 mb-4">
              Camera Scanner
            </h2>
            {scannerActive ? (
              <div className="space-y-4">
                <div
                  id={scannerElementId}
                  className="rounded-xl overflow-hidden"
                />
                <button
                  onClick={stopScanner}
                  className="btn-secondary w-full"
                >
                  Stop Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                className="btn-primary w-full"
              >
                Start Camera
              </button>
            )}
          </div>

          <div className="glass relative overflow-hidden p-6">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <h2 className="font-display text-lg font-bold text-surface-50 mb-4">
              Manual Input
            </h2>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder='Paste QR payload: {"event":"0x...","ticketId":0,"owner":"0x..."}'
                rows={3}
                className="input-field !text-sm resize-none"
              />
              <button
                type="submit"
                className="btn-secondary w-full"
              >
                Verify
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
