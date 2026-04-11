"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

const NAV_LINKS = [
  { href: "/demo",         label: "⚡ Demo" },
  { href: "/verification", label: "How it verifies" },
  { href: "/dashboard",    label: "Dashboard" },
  { href: "/jobs/create",  label: "Post job" },
];

export default function Navbar() {
  const pathname  = usePathname();
  const { publicKey } = useWallet();

  return (
    <nav className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-black font-bold text-sm">
            A
          </div>
          <span className="font-bold text-lg tracking-tight">Aqoryn</span>
          <span className="text-xs text-gray-600 border border-white/10 px-1.5 py-0.5 rounded-full hidden sm:inline">
            devnet
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                pathname === href
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
          {publicKey && (
            <Link
              href={`/profile/${publicKey.toBase58()}`}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                pathname.startsWith("/profile")
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              My reputation
            </Link>
          )}
        </div>

        {/* Wallet button */}
        <WalletMultiButton className="!bg-white/10 !hover:bg-white/20 !text-white !font-medium !text-sm !rounded-xl !border !border-white/10" />
      </div>
    </nav>
  );
}
