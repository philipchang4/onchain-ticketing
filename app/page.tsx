"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { EventCard } from "@/components/EventCard";
import Link from "next/link";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const { data: events, isLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: ticketFactoryAbi,
    functionName: "getEvents",
  });

  const reversed = events ? [...events].reverse() : [];
  const filtered = search
    ? reversed.filter((addr) =>
        addr.toLowerCase().includes(search.toLowerCase())
      )
    : reversed;

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
      </section>

      {/* Events */}
      <section id="events" className="pb-24">
        {events && events.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
            <h2 className="font-display text-2xl font-bold text-surface-50">
              Events
              <span className="text-surface-500 text-sm font-normal ml-2">
                {filtered.length}
                {search && ` of ${events.length}`}
              </span>
            </h2>
            <div className="relative w-full sm:w-64">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by address..."
                className="input-field !py-2 !pl-9 !text-sm"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-2.5 pt-2">
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-full" />
                </div>
                <div className="pt-3 border-t border-white/[0.04]">
                  <div className="skeleton h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((address, i) => (
              <EventCard key={address} address={address} index={i} />
            ))}
          </div>
        ) : events && events.length > 0 && search ? (
          <div className="glass text-center py-16 px-6">
            <p className="text-surface-400">
              No events matching &ldquo;{search}&rdquo;
            </p>
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
