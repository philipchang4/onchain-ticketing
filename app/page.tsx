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
      <div className="mb-12">
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
          {[...events].reverse().map((address) => (
            <EventCard key={address} address={address} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 rounded-xl border border-dashed border-slate-800">
          <p className="text-slate-500 text-lg mb-4">
            No events yet. Be the first to create one.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-500 transition-colors"
          >
            Create Event
          </Link>
        </div>
      )}
    </div>
  );
}
