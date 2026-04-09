"use client";

import { useParams } from "next/navigation";
import {
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { formatEther } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import Link from "next/link";
import { useState } from "react";

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
      ?.map((r, i) => ({ ticketId: i, owner: r.result as string | undefined }))
      .filter(
        (t) => t.owner?.toLowerCase() === userAddress?.toLowerCase()
      )
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

function BuySection({
  address,
  price,
  saleActive,
  cancelled,
  remaining,
  eventPassed,
}: {
  address: `0x${string}`;
  price: bigint;
  saleActive: boolean;
  cancelled: boolean;
  remaining: number;
  eventPassed: boolean;
}) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const canBuy = saleActive && !cancelled && remaining > 0 && !eventPassed;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Purchase</h2>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-white">
          {formatEther(price)}
        </span>
        <span className="text-slate-400">ETH per ticket</span>
      </div>

      {isSuccess ? (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
          <p className="text-green-400 font-medium">Ticket purchased!</p>
        </div>
      ) : (
        <>
          <button
            onClick={() =>
              writeContract({
                address,
                abi: eventTicketAbi,
                functionName: "buyTicket",
                value: price,
              })
            }
            disabled={!canBuy || isPending || isConfirming}
            className="w-full rounded-lg bg-brand-600 px-4 py-3.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
                ? "Confirming..."
                : cancelled
                  ? "Event Cancelled"
                  : !saleActive
                    ? "Sales Paused"
                    : remaining <= 0
                      ? "Sold Out"
                      : eventPassed
                        ? "Event Passed"
                        : "Buy Ticket"}
          </button>
          {error && (
            <p className="text-red-400 text-sm mt-2">
              {error.message.includes("User rejected")
                ? "Transaction rejected."
                : "Transaction failed."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function OrganizerPanel({ address }: { address: `0x${string}` }) {
  const {
    writeContract,
    data: hash,
    isPending,
  } = useWriteContract();
  const { isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <h2 className="text-lg font-semibold text-amber-400 mb-4">
        Organizer Controls
      </h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            writeContract({
              address,
              abi: eventTicketAbi,
              functionName: "setSaleActive",
              args: [false],
            })
          }
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors text-sm"
        >
          Pause Sales
        </button>
        <button
          onClick={() =>
            writeContract({
              address,
              abi: eventTicketAbi,
              functionName: "setSaleActive",
              args: [true],
            })
          }
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors text-sm"
        >
          Resume Sales
        </button>
        <button
          onClick={() =>
            writeContract({
              address,
              abi: eventTicketAbi,
              functionName: "cancelEvent",
            })
          }
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors text-sm"
        >
          Cancel Event
        </button>
        <button
          onClick={() =>
            writeContract({
              address,
              abi: eventTicketAbi,
              functionName: "withdrawProceeds",
            })
          }
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors text-sm"
        >
          Withdraw Proceeds
        </button>
      </div>
    </div>
  );
}

function UserTickets({
  address,
  tickets,
  cancelled,
}: {
  address: `0x${string}`;
  tickets: { ticketId: number; redeemed: boolean }[];
  cancelled: boolean;
}) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });
  const [actionTicketId, setActionTicketId] = useState<number | null>(null);
  const busy = isPending || isConfirming;

  if (tickets.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Your Tickets ({tickets.length})
      </h2>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div
            key={t.ticketId}
            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
          >
            <div>
              <span className="text-white font-mono text-sm">
                Ticket #{t.ticketId}
              </span>
              {t.redeemed && (
                <span className="ml-2 text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                  Redeemed
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {!t.redeemed && !cancelled && (
                <button
                  onClick={() => {
                    setActionTicketId(t.ticketId);
                    writeContract({
                      address,
                      abi: eventTicketAbi,
                      functionName: "redeemTicket",
                      args: [BigInt(t.ticketId)],
                    });
                  }}
                  disabled={busy && actionTicketId === t.ticketId}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-500 disabled:opacity-50 transition-colors"
                >
                  {busy && actionTicketId === t.ticketId
                    ? "..."
                    : "Check In"}
                </button>
              )}
              {!t.redeemed && cancelled && (
                <button
                  onClick={() => {
                    setActionTicketId(t.ticketId);
                    writeContract({
                      address,
                      abi: eventTicketAbi,
                      functionName: "claimRefund",
                      args: [BigInt(t.ticketId)],
                    });
                  }}
                  disabled={busy && actionTicketId === t.ticketId}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500 disabled:opacity-50 transition-colors"
                >
                  {busy && actionTicketId === t.ticketId
                    ? "..."
                    : "Claim Refund"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
          <div className="h-8 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-1/3" />
          <div className="h-64 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const date = eventDate
    ? new Date(Number(eventDate) * 1000)
    : null;
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
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="text-slate-400 hover:text-white text-sm mb-6 inline-block transition-colors"
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
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-slate-900 border border-slate-800 p-4"
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

        {isOrganizer && <OrganizerPanel address={address} />}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
        <p className="text-slate-500 text-xs font-mono break-all">
          Contract: {address}
        </p>
      </div>
    </div>
  );
}
