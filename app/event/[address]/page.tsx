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
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-800 rounded w-24" />
          <div className="h-8 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-800 rounded-lg" />
            ))}
          </div>
          <div className="h-40 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const date = eventDate ? new Date(Number(eventDate) * 1000) : null;
  const remaining =
    maxSupply !== undefined && totalMinted !== undefined
      ? Number(maxSupply) - Number(totalMinted)
      : 0;
  const eventPassed = eventDate
    ? Date.now() / 1000 >= Number(eventDate)
    : false;
  const isOrganizer =
    userAddress &&
    organizer &&
    userAddress.toLowerCase() === organizer.toLowerCase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 animate-fade-in">
      <Link
        href="/"
        className="text-slate-400 hover:text-white text-sm mb-6 inline-flex items-center gap-1 transition-colors duration-200"
      >
        &larr; Back to events
      </Link>

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {name ?? "..."}
            </h1>
            <p className="text-slate-400 text-lg">{venue ?? "..."}</p>
          </div>
          {cancelled && (
            <span className="text-sm bg-red-500/20 text-red-400 px-3 py-1 rounded-full">
              Cancelled
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Date",
            value: date
              ? date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "...",
          },
          {
            label: "Time",
            value: date
              ? date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "...",
          },
          {
            label: "Remaining",
            value:
              maxSupply !== undefined
                ? `${remaining} / ${Number(maxSupply)}`
                : "...",
          },
          {
            label: "Transfers",
            value: transferable ? "Allowed" : "Not allowed",
          },
        ].map((item, i) => (
          <div
            key={item.label}
            className="rounded-lg bg-slate-900 border border-slate-800 p-4 animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <p className="text-slate-500 text-xs mb-1">{item.label}</p>
            <p className="text-white font-medium">{item.value}</p>
          </div>
        ))}
      </div>

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
          />
        )}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
        <p className="text-slate-500 text-xs font-mono break-all">
          Contract:{" "}
          <a
            href={`${BASESCAN_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 transition-colors duration-200"
          >
            {address}
          </a>
        </p>
      </div>
    </div>
  );
}
