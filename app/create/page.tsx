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
          className="text-slate-500 hover:text-white text-sm inline-flex items-center gap-1 transition-colors duration-200 mb-6"
        >
          &larr; Back
        </Link>
        <h1 className="text-4xl font-bold gradient-text mb-3">Create Event</h1>
        <p className="text-slate-400">
          Deploy a new event contract on Base Sepolia.
          {creationFee !== undefined && (
            <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
              Fee: {formatEther(creationFee)} ETH
            </span>
          )}
        </p>
      </div>

      {isSuccess ? (
        <div className="glass p-10 text-center animate-fade-in-up glow-sm">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg className="text-green-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Event Created
          </h2>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">
            Your event contract has been deployed. It will appear on the home
            page shortly.
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
        <div className="glass p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
              className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer transition-colors duration-200 hover:border-white/[0.12]"
            >
              <input
                type="checkbox"
                id="transferable"
                checked={transferable}
                onChange={(e) => setTransferable(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-brand-600 focus:ring-brand-500 bg-transparent"
              />
              <div className="text-sm">
                <span className="font-medium text-white">Allow transfers</span>
                <span className="text-slate-500 block mt-0.5">
                  If disabled, tickets are soulbound and cannot be transferred or resold.
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
