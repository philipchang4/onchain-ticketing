"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { EventCard } from "@/components/EventCard";
import Link from "next/link";

function TicketList({ userAddress }: { userAddress: `0x${string}` }) {
  const { data: events, isLoading: eventsLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: ticketFactoryAbi,
    functionName: "getEvents",
  });

  const balanceContracts = (events ?? []).map((addr) => ({
    address: addr,
    abi: eventTicketAbi,
    functionName: "balanceOf" as const,
    args: [userAddress] as const,
  }));

  const { data: balances, isLoading: balancesLoading } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: (events?.length ?? 0) > 0 },
  });

  if (eventsLoading || balancesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6 animate-pulse h-56"
          />
        ))}
      </div>
    );
  }

  const eventsWithTickets =
    events?.filter((_, i) => {
      const balance = balances?.[i]?.result as bigint | undefined;
      return balance !== undefined && balance > 0n;
    }) ?? [];

  if (eventsWithTickets.length === 0) {
    return (
      <div className="text-center py-24 rounded-xl border border-dashed border-slate-800">
        <p className="text-slate-500 text-lg mb-4">
          You don&apos;t have any tickets yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-500 transition-colors"
        >
          Browse Events
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {eventsWithTickets.map((address) => (
        <EventCard key={address} address={address} />
      ))}
    </div>
  );
}

export default function MyTicketsPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">My Tickets</h1>
      <p className="text-slate-400 mb-8">
        Events where you hold tickets. Click on an event to view, check in, or
        claim refunds.
      </p>

      {!isConnected || !address ? (
        <div className="text-center py-24 rounded-xl border border-dashed border-slate-800">
          <p className="text-slate-500 text-lg">
            Connect your wallet to view your tickets.
          </p>
        </div>
      ) : (
        <TicketList userAddress={address} />
      )}
    </div>
  );
}
