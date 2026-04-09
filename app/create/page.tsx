"use client";

import { useState } from "react";
import {
  useWriteContract,
  useReadContract,
  useAccount,
  useConfig,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, decodeEventLog, maxUint256 } from "viem";
import { ticketFactoryAbi } from "@/lib/abi/TicketFactory";
import { erc20Abi } from "@/lib/abi/ERC20";
import { FACTORY_ADDRESS, USDC_ADDRESS } from "@/lib/contracts";
import Link from "next/link";
import { toast } from "sonner";

type FieldErrors = Partial<Record<"name" | "venue" | "date" | "price" | "maxSupply", string>>;

export default function CreateEventPage() {
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [transferable, setTransferable] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const config = useConfig();
  const { address: userAddress } = useAccount();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const { data: creationFee } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: ticketFactoryAbi,
    functionName: "creationFee",
  });

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: userAddress ? [userAddress, FACTORY_ADDRESS] : undefined,
    query: { enabled: !!userAddress },
  });

  const needsApproval =
    creationFee !== undefined &&
    creationFee > 0n &&
    allowance !== undefined &&
    (allowance as bigint) < (creationFee as bigint);

  function validate(field: string, value: string): string | undefined {
    switch (field) {
      case "name":
        return value.trim() ? undefined : "Event name is required";
      case "venue":
        return value.trim() ? undefined : "Venue is required";
      case "date":
        if (!value) return "Date is required";
        return new Date(value) > new Date() ? undefined : "Must be a future date";
      case "price":
        if (!value) return "Price is required";
        return Number(value) >= 0 ? undefined : "Price must be 0 or more";
      case "maxSupply":
        if (!value) return "Required";
        return Number(value) >= 1 ? undefined : "Must be at least 1";
      default:
        return undefined;
    }
  }

  function handleBlur(field: keyof FieldErrors, value: string) {
    setTouched((prev) => new Set(prev).add(field));
    const err = validate(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
        toast.success("Image uploaded!");
      } else {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setImagePreview("");
    } finally {
      setUploading(false);
    }
  }

  const minDate = new Date().toISOString().slice(0, 16);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: FieldErrors = {
      name: validate("name", name),
      venue: validate("venue", venue),
      date: validate("date", date),
      price: validate("price", price),
      maxSupply: validate("maxSupply", maxSupply),
    };
    setErrors(newErrors);
    setTouched(new Set(["name", "venue", "date", "price", "maxSupply"]));

    if (Object.values(newErrors).some(Boolean)) return;

    setBusy(true);
    try {
      if (needsApproval) {
        setStatus("Approve in Wallet...");
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [FACTORY_ADDRESS, maxUint256],
        });
        setStatus("Approving USDC...");
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      setStatus("Confirm in Wallet...");
      const dateTimestamp = BigInt(Math.floor(new Date(date).getTime() / 1000));
      const createHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: ticketFactoryAbi,
        functionName: "createEvent",
        args: [
          name,
          venue,
          dateTimestamp,
          parseUnits(price, 6),
          BigInt(maxSupply),
          transferable,
          imageUrl,
        ],
      });
      setStatus("Deploying...");
      const receipt = await waitForTransactionReceipt(config, { hash: createHash });

      queryClient.invalidateQueries();

      try {
        const eventLog = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: ticketFactoryAbi,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "EventCreated";
          } catch {
            return false;
          }
        });

        if (eventLog) {
          const decoded = decodeEventLog({
            abi: ticketFactoryAbi,
            data: eventLog.data,
            topics: eventLog.topics,
          });
          const newAddress = (decoded.args as { eventAddress: string }).eventAddress;
          toast.success("Event created! Redirecting...");
          router.push(`/event/${newAddress}`);
          return;
        }
      } catch {
        // Fall through to generic success
      }
      toast.success("Event created!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("User rejected") || msg.includes("User denied")
          ? "Transaction was rejected."
          : "Transaction failed. Please try again."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function fieldClass(field: keyof FieldErrors) {
    const hasError = touched.has(field) && errors[field];
    return `input-field ${hasError ? "!border-red-500/50" : ""}`;
  }

  function errorMsg(field: keyof FieldErrors) {
    if (!touched.has(field) || !errors[field]) return null;
    return <p className="text-red-400 text-xs mt-1.5">{errors[field]}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 animate-fade-in">
      <div className="mb-10">
        <Link
          href="/"
          className="text-surface-500 hover:text-surface-200 text-sm inline-flex items-center gap-1 transition-colors duration-200 mb-6"
        >
          &larr; Back
        </Link>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold gradient-text mb-3">
          Create Event
        </h1>
        <p className="text-surface-400">
          Deploy a new event contract on Base Sepolia.
          {creationFee !== undefined && (
            <span
              className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
              }}
            >
              Fee: {formatUnits(creationFee, 6)} USDC
            </span>
          )}
        </p>
      </div>

      <div className="glass relative overflow-hidden p-8">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Cover Image
            </label>
            <label
              className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-accent-500/30 transition-colors duration-200 cursor-pointer overflow-hidden relative"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-surface-500">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-sm">
                    {uploading ? "Uploading..." : "Click to upload"}
                  </span>
                </div>
              )}
              {imagePreview && uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm">Uploading...</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError("name"); }}
              onBlur={() => handleBlur("name", name)}
              placeholder="Summer Music Festival 2026"
              className={fieldClass("name")}
            />
            {errorMsg("name")}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => { setVenue(e.target.value); clearError("venue"); }}
              onBlur={() => handleBlur("venue", venue)}
              placeholder="Madison Square Garden, NYC"
              className={fieldClass("venue")}
            />
            {errorMsg("venue")}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Date &amp; Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => { setDate(e.target.value); clearError("date"); }}
                onBlur={() => handleBlur("date", date)}
                min={minDate}
                className={`${fieldClass("date")} [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-400 pointer-events-none"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            {errorMsg("date")}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Ticket Price (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => { setPrice(e.target.value); clearError("price"); }}
                onBlur={() => handleBlur("price", price)}
                placeholder="10"
                className={fieldClass("price")}
              />
              {errorMsg("price")}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Max Tickets
              </label>
              <input
                type="number"
                min="1"
                value={maxSupply}
                onChange={(e) => { setMaxSupply(e.target.value); clearError("maxSupply"); }}
                onBlur={() => handleBlur("maxSupply", maxSupply)}
                placeholder="100"
                className={fieldClass("maxSupply")}
              />
              {errorMsg("maxSupply")}
            </div>
          </div>

          <label
            htmlFor="transferable"
            className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/[0.02]"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <input
              type="checkbox"
              id="transferable"
              checked={transferable}
              onChange={(e) => setTransferable(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-surface-600 text-accent-500 focus:ring-accent-500 bg-transparent accent-amber-500"
            />
            <div className="text-sm">
              <span className="font-medium text-surface-100">
                Allow transfers
              </span>
              <span className="text-surface-500 block mt-0.5">
                If disabled, tickets are soulbound and cannot be transferred
                or resold.
              </span>
            </div>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full"
          >
            {status || "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
