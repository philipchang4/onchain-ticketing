"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Events" },
  { href: "/create", label: "Create" },
  { href: "/my-tickets", label: "My Tickets" },
  { href: "/scan", label: "Scan" },
];

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
        active
          ? "text-white bg-white/[0.06]"
          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-white tracking-tight flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              </svg>
            </div>
            Onchain Tickets
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(link.href)}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ConnectButton />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
            aria-label="Toggle navigation"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-white/[0.06] px-6 py-3 flex flex-col gap-1 animate-fade-in">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={isActive(link.href)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      )}
    </header>
  );
}
