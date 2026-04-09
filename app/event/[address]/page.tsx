"use client";

import { useParams } from "next/navigation";
import { useReadContracts, useAccount } from "wagmi";
import { formatEther } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import Link from "next/link";
import { BuySection } from "@/components/BuySection";
import { OrganizerPanel } from "@/components/OrganizerPanel";
import { UserTickets } from "@/components/UserTickets";

const BASESCAN_URL = "https://sepolia.basescan.org";

function useEventData(address: `0x${string}`) {
  const contract = { address, abi: eventTicketAbi } as const;

  return useReadContracts({
    contracts: [
      { ...contract, functionName: "name" },
      { ...contract, functionName: "venue" },
      { ...contract, functionName: "eventDate" },
      { ...contract, functionName: "price" },
      { ...contract, functionName: "maxSupply" },
      { ...contract, functionName: "totalMinted" },
      { ...contract, functionName: "transferable" },
      { ...contract, functionName: "saleActive" },
      { ...contract, functionName: "cancelled" },
      { ...contract, functionName: "organizer" },
    ],
  });
}

function useUserTickets(
  eventAddress: `0x${string}`,
  userAddress: `0x${string}` | undefined,
  totalMinted: number
) {
  const contracts = Array.from({ length: totalMinted }, (_, i) => ({
    address: eventAddress,
    abi: eventTicketAbi,
    functionName: "ownerOf" as const,
    args: [BigInt(i)] as const,
  }));

  const { data: ownerResults } = useReadContracts({
    contracts,
    query: { enabled: totalMinted > 0 && !!userAddress },
  });

  const userTicketIds =
    ownerResults
      ?.map((r, i) => ({
        ticketId: i,
        owner: r.result as string | undefined,
      }))
      .filter((t) => t.owner?.toLowerCase() === userAddress?.toLowerCase())
      .map((t) => t.ticketId) ?? [];

  const redeemedContracts = userTicketIds.map((id) => ({
    address: eventAddress,
    abi: eventTicketAbi,
    functionName: "redeemed" as const,
    args: [BigInt(id)] as const,
  }));

  const { data: redeemedResults } = useReadContracts({
    contracts: redeemedContracts,
    query: { enabled: userTicketIds.length > 0 },
  });

  return userTicketIds.map((id, i) => ({
    ticketId: id,
    redeemed: (redeemedResults?.[i]?.result as boolean) ?? false,
  }));
}

export default function EventDetailPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();

  const { data, isLoading } = useEventData(address);

  const name = data?.[0]?.result as string | undefined;
  const venue = data?.[1]?.result as string | undefined;
  const eventDate = data?.[2]?.result as bigint | undefined;
  const price = data?.[3]?.result as bigint | undefined;
  const maxSupply = data?.[4]?.result as bigint | undefined;
  const totalMinted = data?.[5]?.result as bigint | undefined;
  const transferable = data?.[6]?.result as boolean | undefined;
  const saleActive = data?.[7]?.result as boolean | undefined;
  const cancelled = data?.[8]?.result as boolean | undefined;
  const organizer = data?.[9]?.result as string | undefined;

  const totalMintedNum = totalMinted !== undefined ? Number(totalMinted) : 0;
  const userTickets = useUserTickets(address, userAddress, totalMintedNum);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="space-y-6">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-10 w-2/3" />
          <div className="skeleton h-5 w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24" />
            ))}
          </div>
          <div className="skeleton h-44" />
        </div>
      </div>
    );
  }

  const date = eventDate ? new Date(Number(eventDate) * 1000) : null;
  const remaining =
    maxSupply !== undefined && totalMinted !== undefined
      ? Number(maxSupply) - Number(totalMinted)
      : 0;
  const maxNum = maxSupply !== undefined ? Number(maxSupply) : 0;
  const soldPercent = maxNum > 0 ? (totalMintedNum / maxNum) * 100 : 0;
  const eventPassed = eventDate
    ? Date.now() / 1000 >= Number(eventDate)
    : false;
  const isOrganizer =
    userAddress &&
    organizer &&
    userAddress.toLowerCase() === organizer.toLowerCase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 animate-fade-in">
      <Link
        href="/"
        className="text-slate-500 hover:text-white text-sm inline-flex items-center gap-1 transition-colors duration-200 mb-8"
      >
        &larr; Back to events
      </Link>

      {/* Event header */}
      <div className="glass relative overflow-hidden p-8 mb-8">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-[80px]" />

        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {name ?? "..."}
            </h1>
            <p className="text-slate-400 text-lg flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {venue ?? "..."}
            </p>
          </div>
          {cancelled && (
            <span className="text-sm font-medium bg-red-500/15 text-red-400 px-3 py-1.5 rounded-full border border-red-500/20">
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: "Date",
            value: date
              ? date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "...",
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
          },
          {
            label: "Time",
            value: date
              ? date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "...",
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
          },
          {
            label: "Tickets",
            value: `${remaining} / ${maxNum}`,
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              </svg>
            ),
          },
          {
            label: "Transfers",
            value: transferable ? "Allowed" : "Soulbound",
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            ),
          },
        ].map((item, i) => (
          <div
            key={item.label}
            className="glass p-4 animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1.5">
              {item.icon}
              {item.label}
            </div>
            <p className="text-white font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {maxNum > 0 && (
        <div className="glass p-4 mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-sm">Tickets sold</span>
            <span className="text-white text-sm font-medium">{soldPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700"
              style={{ width: `${soldPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {price !== undefined && (
          <BuySection
            address={address}
            price={price}
            saleActive={saleActive ?? false}
            cancelled={cancelled ?? false}
            remaining={remaining}
            eventPassed={eventPassed}
          />
        )}

        <UserTickets
          address={address}
          tickets={userTickets}
          cancelled={cancelled ?? false}
        />

        {isOrganizer && (
          <OrganizerPanel
            address={address}
            saleActive={saleActive ?? false}
            currentPrice={price ?? 0n}
          />
        )}
      </div>

      <div className="mt-10 glass p-4 flex items-center justify-between">
        <span className="text-slate-500 text-xs">Contract</span>
        <a
          href={`${BASESCAN_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-400 hover:text-brand-300 text-xs font-mono transition-colors duration-200 flex items-center gap-1"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
