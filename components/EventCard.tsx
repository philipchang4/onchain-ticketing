"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";

function relativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventCard({
  address,
  index = 0,
}: {
  address: `0x${string}`;
  index?: number;
}) {
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
  const maxNum = maxSupply !== undefined ? Number(maxSupply as bigint) : 0;
  const mintedNum = totalMinted !== undefined ? Number(totalMinted as bigint) : 0;
  const remaining = maxNum - mintedNum;
  const soldPercent = maxNum > 0 ? (mintedNum / maxNum) * 100 : 0;

  return (
    <Link
      href={`/event/${address}`}
      className="animate-fade-in-up block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 group hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate group-hover:text-brand-400 transition-colors duration-200">
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
              {date ? relativeDate(date) : "..."}
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
                ? `${remaining} / ${maxNum}`
                : "..."}
            </span>
          </div>
        </div>

        {maxNum > 0 && (
          <div className="mt-4">
            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${soldPercent}%` }}
              />
            </div>
            <p className="text-slate-600 text-xs mt-1">
              {soldPercent.toFixed(0)}% sold
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
