"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import { Toaster } from "react-hot-toast";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet"),
    []
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <html lang="en">
      <head>
        <title>Aqoryn — Get paid for your work</title>
        <meta name="description" content="Trustless freelance payment protocol on Solana. Proof of work. Automatic payment. No middleman." />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-[#0a0a0f] text-white antialiased min-h-screen">
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "#1a1a2e",
                    color: "#fff",
                    border: "1px solid #2a2a4a",
                  },
                }}
              />
              <Navbar />
              <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
              </main>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}
