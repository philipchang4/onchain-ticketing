"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { TicketCard } from "@/components/TicketCard";
import Link from "next/link";

interface UserTicket {
  eventAddress: `0x${string}`;
  ticketId: number;
}

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

  const totalMintedContracts = (events ?? []).map((addr) => ({
    address: addr,
    abi: eventTicketAbi,
    functionName: "totalMinted" as const,
  }));

  const { data: mintedData } = useReadContracts({
    contracts: totalMintedContracts,
    query: { enabled: (events?.length ?? 0) > 0 },
  });

  const eventsWithBalance = (events ?? []).filter((_, i) => {
    const balance = balances?.[i]?.result as bigint | undefined;
    return balance !== undefined && balance > 0n;
  });

  const ownerContracts = eventsWithBalance.flatMap((addr, evtIdx) => {
    const originalIdx = events!.indexOf(addr);
    const totalMinted = mintedData?.[originalIdx]?.result as bigint | undefined;
    const count = totalMinted ? Number(totalMinted) : 0;
    return Array.from({ length: count }, (_, i) => ({
      address: addr,
      abi: eventTicketAbi,
      functionName: "ownerOf" as const,
      args: [BigInt(i)] as const,
      _eventAddress: addr,
      _ticketId: i,
    }));
  });

  const { data: ownerResults } = useReadContracts({
    contracts: ownerContracts.map(({ _eventAddress, _ticketId, ...c }) => c),
    query: { enabled: ownerContracts.length > 0 },
  });

  const userTickets: UserTicket[] = [];
  ownerContracts.forEach((c, i) => {
    const owner = ownerResults?.[i]?.result as string | undefined;
    if (owner?.toLowerCase() === userAddress.toLowerCase()) {
      userTickets.push({
        eventAddress: c._eventAddress,
        ticketId: c._ticketId,
      });
    }
  });

  if (eventsLoading || balancesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass p-5 flex gap-4">
            <div className="skeleton w-24 h-24 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5 pt-1">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-3 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (userTickets.length === 0) {
    return (
      <div className="glass text-center py-20 px-6 animate-fade-in">
        <div
          className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.15)",
          }}
        >
          <svg className="text-accent-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          </svg>
        </div>
        <p className="text-surface-50 font-display font-bold text-lg mb-2">
          No tickets yet
        </p>
        <p className="text-surface-500 text-sm mb-8">
          Browse events and grab a ticket.
        </p>
        <Link href="/" className="btn-primary">
          Browse Events
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {userTickets.map((t) => (
        <TicketCard
          key={`${t.eventAddress}-${t.ticketId}`}
          eventAddress={t.eventAddress}
          ticketId={t.ticketId}
          owner={userAddress}
        />
      ))}
    </div>
  );
}

export default function MyTicketsPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 animate-fade-in">
      <h1 className="font-display text-3xl font-bold text-surface-50 mb-2">
        My Tickets
      </h1>
      <p className="text-surface-400 mb-10">
        Your tickets with QR codes for check-in.
      </p>

      {!isConnected || !address ? (
        <div className="glass text-center py-20 px-6">
          <p className="text-surface-500 text-lg">
            Connect your wallet to view your tickets.
          </p>
        </div>
      ) : (
        <TicketList userAddress={address} />
      )}
    </div>
  );
}
