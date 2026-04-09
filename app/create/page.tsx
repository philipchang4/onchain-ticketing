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

  const inputClass =
    "w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors duration-200";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">Create Event</h1>
      <p className="text-slate-400 mb-8">
        Deploy a new event contract on Base Sepolia.
        {creationFee !== undefined && (
          <span className="text-slate-300">
            {" "}
            Creation fee: {formatEther(creationFee)} ETH
          </span>
        )}
      </p>

      {isSuccess ? (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-8 text-center animate-fade-in-up">
          <h2 className="text-xl font-semibold text-green-400 mb-2">
            Event Created
          </h2>
          <p className="text-slate-400 mb-4">
            Your event contract has been deployed. It will appear on the home
            page shortly.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="btn-press px-6 py-2 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-500 transition-colors duration-200"
            >
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
              className="btn-press px-6 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200"
            >
              Create Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Music Festival 2026"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Madison Square Garden, NYC"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Ticket Price (ETH)
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.0001"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Max Tickets
              </label>
              <input
                type="number"
                min="1"
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
                placeholder="100"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <input
              type="checkbox"
              id="transferable"
              checked={transferable}
              onChange={(e) => setTransferable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="transferable" className="text-sm text-slate-300">
              <span className="font-medium">Allow transfers</span>
              <span className="text-slate-500 block">
                If disabled, tickets cannot be transferred or resold.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="btn-press w-full rounded-lg bg-brand-600 px-4 py-3.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
                ? "Deploying..."
                : "Create Event"}
          </button>
        </form>
      )}
    </div>
  );
}
