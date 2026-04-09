"use client";

import { useReadContract } from "wagmi";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { EventCard } from "@/components/EventCard";
import Link from "next/link";

export default function HomePage() {
  const { data: events, isLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: ticketFactoryAbi,
    functionName: "getEvents",
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12 animate-fade-in">
        <h1 className="text-4xl font-bold text-white mb-3">
          Onchain Ticketing
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Events with transparent pricing, counterfeit-proof tickets, and
          code-enforced rules. No middleman fees.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 animate-pulse h-56"
            />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...events].reverse().map((address, i) => (
            <EventCard key={address} address={address} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 rounded-xl border border-dashed border-slate-800 animate-fade-in">
          <div className="mb-6">
            <svg
              className="mx-auto text-slate-700"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
          </div>
          <p className="text-slate-500 text-lg mb-2">
            No events yet
          </p>
          <p className="text-slate-600 text-sm mb-6">
            Be the first to create an onchain event.
          </p>
          <Link
            href="/create"
            className="btn-press inline-flex items-center px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-500 transition-colors duration-200"
          >
            Create Event
          </Link>
        </div>
      )}
    </div>
  );
}
