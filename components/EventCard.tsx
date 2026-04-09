"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
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
      { ...contract, functionName: "imageUrl" },
    ],
  });

  if (isLoading || !data) {
    return <div className="skeleton h-72" />;
  }

  const [name, venue, eventDate, price, maxSupply, totalMinted, cancelled, saleActive, imageUrl] =
    data.map((d) => d.result);

  const date = eventDate ? new Date(Number(eventDate as bigint) * 1000) : null;
  const maxNum = maxSupply !== undefined ? Number(maxSupply as bigint) : 0;
  const mintedNum = totalMinted !== undefined ? Number(totalMinted as bigint) : 0;
  const remaining = maxNum - mintedNum;
  const soldPercent = maxNum > 0 ? (mintedNum / maxNum) * 100 : 0;

  return (
    <Link
      href={`/event/${address}`}
      className="animate-fade-in-up block group"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="glass glass-hover relative overflow-hidden h-full">
        {(imageUrl as string) ? (
          <div className="h-36 w-full overflow-hidden">
            <img
              src={imageUrl as string}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-20 w-full bg-gradient-to-br from-accent-500/10 to-transparent" />
        )}
        <div className="p-6">
        {/* Warm top highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />

        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl font-bold text-surface-50 truncate group-hover:text-accent-400 transition-colors duration-200">
              {(name as string) ?? "..."}
            </h3>
            <p className="text-surface-500 text-sm truncate mt-1">
              {(venue as string) ?? "..."}
            </p>
          </div>
          {cancelled ? (
            <span className="text-[11px] font-medium bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full ml-3 shrink-0 border border-red-500/15">
              Cancelled
            </span>
          ) : saleActive ? (
            <span className="text-[11px] font-medium bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full ml-3 shrink-0 border border-green-500/15">
              On Sale
            </span>
          ) : (
            <span className="text-[11px] font-medium bg-accent-500/10 text-accent-400 px-2.5 py-1 rounded-full ml-3 shrink-0 border border-accent-500/15">
              Paused
            </span>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-surface-500">Date</span>
            <span className="text-surface-200 font-medium">
              {date ? relativeDate(date) : "..."}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-surface-500">Price</span>
            <span className="text-surface-200 font-medium">
              {price !== undefined
                ? `${formatUnits(price as bigint, 6)} USDC`
                : "..."}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-surface-500">Remaining</span>
            <span className="text-surface-200 font-medium">
              {`${remaining} / ${maxNum}`}
            </span>
          </div>
        </div>

        {maxNum > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.04]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-surface-600 text-xs">
                {soldPercent.toFixed(0)}% sold
              </span>
              <span className="text-surface-600 text-xs">{remaining} left</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${soldPercent}%`,
                  background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                }}
              />
            </div>
          </div>
        )}
        </div>
      </div>
    </Link>
  );
}
