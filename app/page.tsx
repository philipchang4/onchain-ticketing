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
      <section className="relative py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-accent-500/[0.07] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative">
          <div
            className="animate-fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-8"
            style={{
              background: "rgba(245, 158, 11, 0.06)",
              borderColor: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live on Base Sepolia
          </div>

          <h1
            className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-8 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <span className="gradient-text">Onchain</span>
            <br />
            <span className="text-surface-50">Ticketing</span>
          </h1>

          <p
            className="text-surface-400 text-lg md:text-xl max-w-lg leading-relaxed mb-12 animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            Transparent pricing. Counterfeit-proof tickets.
            Code-enforced rules. No middleman.
          </p>

          <div
            className="flex flex-wrap gap-4 animate-fade-in-up"
            style={{ animationDelay: "240ms" }}
          >
            <Link href="/create" className="btn-primary">
              Create Event
            </Link>
            <a href="#events" className="btn-secondary">
              Browse Events
            </a>
          </div>
        </div>

        <div
          className="mt-20 flex gap-12 animate-fade-in-up"
          style={{ animationDelay: "320ms" }}
        >
          {[
            { value: "~$0.01", label: "Mint cost" },
            { value: "ERC-721", label: "Standard" },
            { value: "Onchain", label: "Transfer rules" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-surface-50 font-display font-bold text-xl">
                {stat.value}
              </p>
              <p className="text-surface-500 text-xs mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Events */}
      <section id="events" className="pb-24">
        {events && events.length > 0 && (
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="font-display text-2xl font-bold text-surface-50">
              Events
            </h2>
            <span className="text-surface-500 text-sm">
              {events.length} total
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-72" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...events].reverse().map((address, i) => (
              <EventCard key={address} address={address} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass text-center py-24 px-6 animate-fade-in">
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
              }}
            >
              <svg
                className="text-accent-400"
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
            <p className="text-surface-50 font-display font-bold text-xl mb-2">
              No events yet
            </p>
            <p className="text-surface-500 text-sm mb-10 max-w-sm mx-auto">
              Deploy the first onchain event with transparent pricing and
              code-enforced ticket rules.
            </p>
            <Link href="/create" className="btn-primary">
              Create Event
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
