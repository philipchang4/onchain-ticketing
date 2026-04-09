"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useAccount, useConfig } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits, maxUint256 } from "viem";
import { eventTicketAbi } from "@/lib/abi/EventTicket";
import { erc20Abi } from "@/lib/abi/ERC20";
import { USDC_ADDRESS } from "@/lib/contracts";
import { toast } from "sonner";

export function BuySection({
  address,
  price,
  saleActive,
  cancelled,
  remaining,
  eventPassed,
  onPurchase,
}: {
  address: `0x${string}`;
  price: bigint;
  saleActive: boolean;
  cancelled: boolean;
  remaining: number;
  eventPassed: boolean;
  onPurchase?: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const config = useConfig();
  const { address: userAddress } = useAccount();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: userAddress ? [userAddress, address] : undefined,
    query: { enabled: !!userAddress },
  });

  const canBuy = saleActive && !cancelled && remaining > 0 && !eventPassed;
  const maxBuy = Math.min(remaining, 10);
  const totalPrice = price * BigInt(quantity);
  const needsApproval =
    allowance !== undefined && (allowance as bigint) < totalPrice;

  async function handleBuy() {
    setBusy(true);
    try {
      if (needsApproval) {
        setStatus("Approve in Wallet...");
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [address, maxUint256],
        });
        setStatus("Approving USDC...");
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      setStatus("Confirm in Wallet...");
      let buyHash;
      if (quantity === 1) {
        buyHash = await writeContractAsync({
          address,
          abi: eventTicketAbi,
          functionName: "buyTicket",
          args: [buyerName],
        });
      } else {
        buyHash = await writeContractAsync({
          address,
          abi: eventTicketAbi,
          functionName: "buyTickets",
          args: [BigInt(quantity), buyerName],
        });
      }
      setStatus("Confirming...");
      await waitForTransactionReceipt(config, { hash: buyHash });
      toast.success(
        quantity > 1 ? `${quantity} tickets purchased!` : "Ticket purchased!"
      );
      queryClient.invalidateQueries();
      onPurchase?.();
      setQuantity(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("User rejected") || msg.includes("User denied")
          ? "Transaction rejected."
          : "Transaction failed."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function buttonLabel() {
    if (status) return status;
    if (cancelled) return "Event Cancelled";
    if (!saleActive) return "Sales Paused";
    if (remaining <= 0) return "Sold Out";
    if (eventPassed) return "Event Passed";
    return quantity > 1 ? `Buy ${quantity} Tickets` : "Buy Ticket";
  }

  return (
    <div className="glass relative overflow-hidden p-6">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/25 to-transparent" />

      <h2 className="text-sm font-medium text-surface-400 mb-3 uppercase tracking-wider">
        Purchase
      </h2>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-4xl font-bold text-surface-50">
          {formatUnits(price, 6)}
        </span>
        <span className="text-surface-500 text-sm">USDC / ticket</span>
      </div>

      {canBuy && !busy && (
        <div className="my-4">
          <label className="block text-surface-400 text-sm mb-1.5">Your Name</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Enter your name for the ticket"
            className="input-field !py-2 !text-sm"
          />
        </div>
      )}

      {canBuy && !busy && (
        <div className="flex items-center gap-3 my-5">
          <span className="text-surface-400 text-sm">Qty</span>
          <div className="flex items-center rounded-xl border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="px-3 py-2 text-surface-300 hover:bg-white/[0.04] disabled:opacity-30 transition-colors duration-150 text-sm"
            >
              -
            </button>
            <span className="px-4 py-2 text-surface-50 font-medium text-sm min-w-[3rem] text-center border-x border-white/[0.06]">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(maxBuy, quantity + 1))}
              disabled={quantity >= maxBuy}
              className="px-3 py-2 text-surface-300 hover:bg-white/[0.04] disabled:opacity-30 transition-colors duration-150 text-sm"
            >
              +
            </button>
          </div>
          {quantity > 1 && (
            <span className="text-surface-500 text-xs">
              {formatUnits(price, 6)} x {quantity} = {formatUnits(totalPrice, 6)} USDC
            </span>
          )}
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={!canBuy || busy || !buyerName.trim()}
        className="btn-primary w-full"
      >
        {buttonLabel()}
      </button>
    </div>
  );
}
