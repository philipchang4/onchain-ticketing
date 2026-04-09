"use client";

import { useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
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
}: {
  address: `0x${string}`;
  price: bigint;
  saleActive: boolean;
  cancelled: boolean;
  remaining: number;
  eventPassed: boolean;
}) {
  const { address: userAddress } = useAccount();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: userAddress ? [userAddress, address] : undefined,
    query: { enabled: !!userAddress },
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const canBuy = saleActive && !cancelled && remaining > 0 && !eventPassed;
  const needsApproval =
    allowance !== undefined && (allowance as bigint) < price;

  useEffect(() => {
    if (error) {
      toast.error(
        error.message.includes("User rejected")
          ? "Transaction rejected."
          : "Transaction failed."
      );
      reset();
    }
  }, [error, reset]);

  useEffect(() => {
    if (isSuccess) {
      if (needsApproval) {
        toast.success("USDC approved! You can now buy your ticket.");
        refetchAllowance();
      } else {
        toast.success("Ticket purchased!");
      }
      reset();
    }
  }, [isSuccess, needsApproval, reset, refetchAllowance]);

  function handleClick() {
    if (needsApproval) {
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [address, maxUint256],
      });
    } else {
      writeContract({
        address,
        abi: eventTicketAbi,
        functionName: "buyTicket",
      });
    }
  }

  function buttonLabel() {
    if (isPending) return "Confirm in Wallet...";
    if (isConfirming) return needsApproval ? "Approving..." : "Confirming...";
    if (cancelled) return "Event Cancelled";
    if (!saleActive) return "Sales Paused";
    if (remaining <= 0) return "Sold Out";
    if (eventPassed) return "Event Passed";
    if (needsApproval) return "Approve USDC";
    return "Buy Ticket";
  }

  return (
    <div className="glass relative overflow-hidden p-6">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <h2 className="text-sm font-medium text-slate-400 mb-3">Purchase</h2>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-bold text-white">
          {formatUnits(price, 6)}
        </span>
        <span className="text-slate-500 text-sm">USDC / ticket</span>
      </div>

      <button
        onClick={handleClick}
        disabled={!canBuy || isPending || isConfirming}
        className="btn-primary w-full"
      >
        {buttonLabel()}
      </button>
    </div>
  );
}
