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
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center animate-pulse">
        <p className="text-slate-400">Verifying ticket onchain...</p>
      </div>
    );
  }

  const eventName = results?.[0]?.result as string | undefined;
  const actualOwner = results?.[1]?.result as string | undefined;
  const isRedeemed = results?.[2]?.result as boolean | undefined;

  const ownerMatches =
    actualOwner?.toLowerCase() === data.owner.toLowerCase();
  const isValid = ownerMatches && !isRedeemed;

  return (
    <div className="animate-scale-in space-y-4">
      <div
        className={`rounded-xl border p-6 ${
          isSuccess
            ? "border-green-500/30 bg-green-500/5"
            : isValid
              ? "border-brand-500/30 bg-brand-500/5"
              : "border-red-500/30 bg-red-500/5"
        }`}
      >
        <div className="text-center mb-6">
          {isSuccess ? (
            <>
              <div className="text-4xl mb-2">&#10003;</div>
              <h2 className="text-xl font-semibold text-green-400">
                Ticket Redeemed
              </h2>
            </>
          ) : isValid ? (
            <>
              <div className="text-4xl mb-2">&#9989;</div>
              <h2 className="text-xl font-semibold text-brand-400">
                Valid Ticket
              </h2>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">&#10060;</div>
              <h2 className="text-xl font-semibold text-red-400">
                {isRedeemed ? "Already Redeemed" : "Invalid Ticket"}
              </h2>
            </>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Event</span>
            <span className="text-slate-300">{eventName ?? "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ticket ID</span>
            <span className="text-white font-mono">#{data.ticketId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Owner</span>
            <span className="text-slate-300 font-mono text-xs">
              {data.owner.slice(0, 6)}...{data.owner.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ownership</span>
            <span className={ownerMatches ? "text-green-400" : "text-red-400"}>
              {ownerMatches ? "Verified" : "Mismatch"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
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
            className="btn flex-1 rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
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
          className="btn flex-1 rounded-lg bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-700"
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
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Scan Tickets</h1>
      <p className="text-slate-400 mb-8">
        Scan a ticket QR code to verify ownership and check in attendees.
      </p>

      {ticketData ? (
        <TicketValidator
          data={ticketData}
          onReset={() => setTicketData(null)}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Camera Scanner
            </h2>
            {scannerActive ? (
              <div className="space-y-4">
                <div
                  id={scannerElementId}
                  className="rounded-lg overflow-hidden"
                />
                <button
                  onClick={stopScanner}
                  className="btn w-full rounded-lg bg-slate-800 px-4 py-3 text-slate-300 hover:bg-slate-700"
                >
                  Stop Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                className="btn w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-500"
              >
                Start Camera
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Manual Input
            </h2>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder='Paste QR payload: {"event":"0x...","ticketId":0,"owner":"0x..."}'
                rows={3}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="btn w-full rounded-lg bg-slate-700 px-4 py-2.5 text-white text-sm hover:bg-slate-600"
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
