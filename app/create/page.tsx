"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import Link from "next/link";
import { toast } from "sonner";

export default function CreateEventPage() {
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [transferable, setTransferable] = useState(false);

  const { data: creationFee } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: ticketFactoryAbi,
    functionName: "creationFee",
  });

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
      const msg = error.message.includes("User rejected")
        ? "Transaction was rejected."
        : "Transaction failed. Please try again.";
      toast.error(msg);
      reset();
    }
  }, [error, reset]);

  useEffect(() => {
    if (isSuccess) {
      toast.success("Event created! It will appear on the home page shortly.");
    }
  }, [isSuccess]);

  const minDate = new Date().toISOString().slice(0, 16);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const selectedDate = new Date(date);
    if (selectedDate <= new Date()) {
      toast.error("Event date must be in the future.");
      return;
    }

    const dateTimestamp = BigInt(Math.floor(selectedDate.getTime() / 1000));

    writeContract({
      address: FACTORY_ADDRESS,
      abi: ticketFactoryAbi,
      functionName: "createEvent",
      args: [
        name,
        venue,
        dateTimestamp,
        parseEther(price),
        BigInt(maxSupply),
        transferable,
      ],
      value: creationFee ?? 0n,
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 animate-fade-in">
      <div className="mb-10">
        <Link
          href="/"
          className="text-surface-500 hover:text-surface-200 text-sm inline-flex items-center gap-1 transition-colors duration-200 mb-6"
        >
          &larr; Back
        </Link>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold gradient-text mb-3">
          Create Event
        </h1>
        <p className="text-surface-400">
          Deploy a new event contract on Base Sepolia.
          {creationFee !== undefined && (
            <span
              className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
              }}
            >
              Fee: {formatEther(creationFee)} ETH
            </span>
          )}
        </p>
      </div>

      {isSuccess ? (
        <div className="glass p-10 text-center animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-green-500/10 border border-green-500/15 flex items-center justify-center">
            <svg className="text-green-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-surface-50 mb-2">
            Event Created
          </h2>
          <p className="text-surface-400 mb-8 max-w-sm mx-auto">
            Your event contract has been deployed successfully.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="btn-primary">
              View Events
            </Link>
            <button
              onClick={() => {
                reset();
                setName("");
                setVenue("");
                setDate("");
                setPrice("");
                setMaxSupply("");
                setTransferable(false);
              }}
              className="btn-secondary"
            >
              Create Another
            </button>
          </div>
        </div>
      ) : (
        <div className="glass relative overflow-hidden p-8">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Event Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Music Festival 2026"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Venue
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Madison Square Garden, NYC"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Ticket Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.0001"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Max Tickets
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                  placeholder="100"
                  className="input-field"
                  required
                />
              </div>
            </div>

            <label
              htmlFor="transferable"
              className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/[0.02]"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <input
                type="checkbox"
                id="transferable"
                checked={transferable}
                onChange={(e) => setTransferable(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-surface-600 text-accent-500 focus:ring-accent-500 bg-transparent accent-amber-500"
              />
              <div className="text-sm">
                <span className="font-medium text-surface-100">
                  Allow transfers
                </span>
                <span className="text-surface-500 block mt-0.5">
                  If disabled, tickets are soulbound and cannot be transferred
                  or resold.
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="btn-primary w-full"
            >
              {isPending
                ? "Confirm in Wallet..."
                : isConfirming
                  ? "Deploying..."
                  : "Create Event"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
