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
    <div className="mx-auto max-w-7xl px-6">
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live on Base Sepolia
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="gradient-text">Onchain</span>
            <br />
            <span className="text-white">Ticketing</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-xl leading-relaxed mb-10">
            Transparent pricing. Counterfeit-proof tickets. Code-enforced rules.
            No middleman.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/create" className="btn-primary">
              Create Event
            </Link>
            <a href="#events" className="btn-secondary">
              Browse Events
            </a>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          {[
            { label: "Mint cost", value: "~$0.01" },
            { label: "Ownership", value: "ERC-721" },
            { label: "Transfer rules", value: "Onchain" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-white font-semibold text-lg">{stat.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Events */}
      <section id="events" className="pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">
            {events && events.length > 0 ? "Events" : ""}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-64" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...events].reverse().map((address, i) => (
              <EventCard key={address} address={address} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass text-center py-20 px-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <svg
                className="text-brand-400"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-white font-medium text-lg mb-2">
              No events yet
            </p>
            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
              Deploy the first onchain event with transparent pricing and code-enforced ticket rules.
            </p>
            <Link href="/create" className="btn-primary inline-flex">
              Create Event
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
