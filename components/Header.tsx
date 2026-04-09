"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            Onchain Tickets
          </Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Events
            </Link>
            <Link
              href="/create"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Create Event
            </Link>
            <Link
              href="/my-tickets"
              className="text-slate-400 hover:text-white transition-colors"
            >
              My Tickets
            </Link>
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
