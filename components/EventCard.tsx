"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";

export function EventCard({ address }: { address: `0x${string}` }) {
  const contract = { address, abi: eventTicketAbi } as const;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...contract, functionName: "name" },
      { ...contract, functionName: "venue" },
      { ...contract, functionName: "eventDate" },
      { ...contract, functionName: "price" },
      { ...contract, functionName: "maxSupply" },
      { ...contract, functionName: "totalMinted" },
      { ...contract, functionName: "cancelled" },
      { ...contract, functionName: "saleActive" },
    ],
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 animate-pulse h-56" />
    );
  }

  const [name, venue, eventDate, price, maxSupply, totalMinted, cancelled, saleActive] =
    data.map((d) => d.result);

  const date = eventDate
    ? new Date(Number(eventDate as bigint) * 1000)
    : null;
  const remaining =
    maxSupply !== undefined && totalMinted !== undefined
      ? Number(maxSupply as bigint) - Number(totalMinted as bigint)
      : null;

  return (
    <Link href={`/event/${address}`}>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-brand-500 transition-all hover:shadow-lg hover:shadow-brand-500/5 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
              {(name as string) ?? "..."}
            </h3>
            <p className="text-slate-400 text-sm truncate">
              {(venue as string) ?? "..."}
            </p>
          </div>
          {cancelled ? (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full ml-2 shrink-0">
              Cancelled
            </span>
          ) : saleActive ? (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full ml-2 shrink-0">
              On Sale
            </span>
          ) : (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full ml-2 shrink-0">
              Paused
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm mt-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span className="text-slate-300">
              {date
                ? date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "..."}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Price</span>
            <span className="text-slate-300">
              {price !== undefined
                ? `${formatEther(price as bigint)} ETH`
                : "..."}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Remaining</span>
            <span className="text-slate-300">
              {remaining !== null
                ? `${remaining} / ${Number(maxSupply as bigint)}`
                : "..."}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
