"use client";

import { useState, useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { EventCard } from "@/components/EventCard";
import Link from "next/link";

type StatusFilter = "all" | "on-sale" | "paused" | "cancelled";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: events, isLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: ticketFactoryAbi,
    functionName: "getEvents",
  });

  const reversed = events ? [...events].reverse() : [];

  // Batch-read names and saleActive/cancelled for filtering
  const metaContracts = reversed.flatMap((addr) => [
    { address: addr, abi: eventTicketAbi, functionName: "name" as const },
    { address: addr, abi: eventTicketAbi, functionName: "saleActive" as const },
    { address: addr, abi: eventTicketAbi, functionName: "cancelled" as const },
  ]);

  const { data: metaResults } = useReadContracts({
    contracts: metaContracts,
    query: { enabled: reversed.length > 0 },
  });

  const eventMeta = useMemo(() => {
    return reversed.map((addr, i) => ({
      address: addr,
      name: (metaResults?.[i * 3]?.result as string) ?? "",
      saleActive: (metaResults?.[i * 3 + 1]?.result as boolean) ?? false,
      cancelled: (metaResults?.[i * 3 + 2]?.result as boolean) ?? false,
    }));
  }, [reversed, metaResults]);

  const filtered = useMemo(() => {
    return eventMeta.filter(({ name, saleActive, cancelled }) => {
      const matchesSearch =
        !search || name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "on-sale" && saleActive && !cancelled) ||
        (statusFilter === "paused" && !saleActive && !cancelled) ||
        (statusFilter === "cancelled" && cancelled);
      return matchesSearch && matchesStatus;
    });
  }, [eventMeta, search, statusFilter]);

  const hasEvents = reversed.length > 0;

  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "on-sale", label: "On Sale" },
    { id: "paused", label: "Paused" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Hero -- compact when events exist */}
      <section className={`relative overflow-hidden ${hasEvents ? "py-16 md:py-20" : "py-24 md:py-36"}`}>
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-accent-500/[0.08] rounded-full blur-[150px]" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[140px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative">
          <div
            className="animate-fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-6"
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
            className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <span className="gradient-text">Stub</span>
            <span className="text-surface-50">less</span>
          </h1>

          {!hasEvents && (
            <p
              className="text-surface-400 text-lg md:text-xl max-w-lg leading-relaxed mb-10 animate-fade-in-up"
              style={{ animationDelay: "160ms" }}
            >
              Transparent pricing. Counterfeit-proof tickets.
              Code-enforced rules. No middleman.
            </p>
          )}

          <div
            className="flex flex-wrap gap-4 animate-fade-in-up"
            style={{ animationDelay: hasEvents ? "80ms" : "240ms" }}
          >
            <Link href="/create" className="btn-primary">
              Create Event
            </Link>
            {!hasEvents && (
              <a
                href="#events"
                className="btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Browse Events
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="pb-24">
        {hasEvents && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-display text-2xl font-bold text-surface-50">
                Events
              </h2>
              {/* Status filter pills */}
              <div className="flex items-center gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      statusFilter === f.id
                        ? "bg-accent-500/20 text-accent-300 border border-accent-500/30"
                        : "bg-white/[0.04] text-surface-400 border border-white/[0.06] hover:text-surface-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

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
                placeholder="Search events..."
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
            {filtered.map(({ address }, i) => (
              <EventCard key={address} address={address} index={i} />
            ))}
          </div>
        ) : hasEvents ? (
          <div className="glass text-center py-16 px-6 animate-fade-in">
            <p className="text-surface-400">
              No events match your search.
            </p>
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-accent-400 text-sm mt-2 hover:text-accent-300 transition-colors"
            >
              Clear filters
            </button>
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
              <svg className="text-accent-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-surface-50 font-display font-bold text-xl mb-2">No events yet</p>
            <p className="text-surface-500 text-sm mb-10 max-w-sm mx-auto">
              Deploy the first onchain event with transparent pricing and code-enforced ticket rules.
            </p>
            <Link href="/create" className="btn-primary">Create Event</Link>
          </div>
        )}
      </section>
    </div>
  );
}
