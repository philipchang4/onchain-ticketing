"use client";

import { FACTORY_ADDRESS } from "@/lib/contracts";

const BASESCAN_URL = "https://sepolia.basescan.org";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Base Sepolia
            </div>
            <a
              href={`${BASESCAN_URL}/address/${FACTORY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-slate-600 hover:text-brand-400 transition-colors duration-200"
            >
              Factory: {FACTORY_ADDRESS.slice(0, 6)}...{FACTORY_ADDRESS.slice(-4)}
            </a>
          </div>

          <p className="text-xs text-slate-600">
            Decentralized event ticketing powered by ERC-721
          </p>
        </div>
      </div>
    </footer>
  );
}
