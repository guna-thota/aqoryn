"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { Award, ExternalLink, Star, TrendingUp, Wallet } from "lucide-react";

// Mock data — replace with on-chain fetch via getReputationRecords()
const MOCK_PROFILE = {
  wallet:        "FrEeLaNcErWaLLetAdDrEsS1234567890xY",
  totalJobs:     7,
  totalEarned:   3420,
  avgDeliveryH:  31,
  categories:    ["web-development", "design", "smart-contracts"],
  nfts: [
    {
      mint:      "NFTMint1AbCdEf1234567890",
      jobId:     "550e8400-e29b-41d4-a716-446655440000",
      title:     "React landing page",
      category:  "web-development",
      amount:    500,
      deliveredInHours: 28,
      mintedAt:  "2024-06-15T10:30:00Z",
      txSig:     "5KtP9xZab2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9",
      verified:  true,
    },
    {
      mint:      "NFTMint2XyZwQrSt5678901",
      jobId:     "661f9511-f30c-52e5-b827-557766551111",
      title:     "Figma design system",
      category:  "design",
      amount:    800,
      deliveredInHours: 42,
      mintedAt:  "2024-05-20T14:00:00Z",
      txSig:     "6LuQ0yAbc3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8T9U0",
      verified:  true,
    },
    {
      mint:      "NFTMint3AbCdWxYz9012345",
      jobId:     "772g0622-g41d-63f6-c938-668877662222",
      title:     "Solana escrow contract",
      category:  "smart-contracts",
      amount:    1200,
      deliveredInHours: 18,
      mintedAt:  "2024-04-10T09:00:00Z",
      txSig:     "7MvR1zBcd4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0V1",
      verified:  true,
    },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  "web-development":  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "design":           "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "smart-contracts":  "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "data-analysis":    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "content":          "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export default function ProfilePage({ params }: { params: { wallet: string } }) {
  const { publicKey } = useWallet();
  const profile = MOCK_PROFILE;
  const isOwn   = publicKey?.toBase58() === profile.wallet;

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono">
              {profile.wallet.slice(0, 8)}…{profile.wallet.slice(-8)}
            </h1>
            <div className="flex gap-2 mt-2">
              {profile.categories.map((cat) => (
                <span
                  key={cat}
                  className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat] ?? "bg-gray-500/10 text-gray-400"}`}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
        {isOwn && (
          <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1 rounded-full">
            Your profile
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-teal-400">{profile.totalJobs}</div>
          <div className="text-xs text-gray-500 mt-1">Jobs completed</div>
          <div className="text-xs text-gray-600 mt-0.5">on-chain verified</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold">${profile.totalEarned.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Total earned (USDC)</div>
          <div className="text-xs text-gray-600 mt-0.5">trustless payments</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold">{profile.avgDeliveryH}h</div>
          <div className="text-xs text-gray-500 mt-1">Avg. delivery time</div>
          <div className="text-xs text-gray-600 mt-0.5">before deadline</div>
        </div>
      </div>

      {/* Proof of Work NFTs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-teal-400" />
          <h2 className="font-semibold">Proof-of-Work NFTs</h2>
          <span className="text-xs text-gray-500 ml-1">
            Soul-bound tokens — portable, permanent, unforgeble
          </span>
        </div>

        <div className="space-y-4">
          {profile.nfts.map((nft) => (
            <div
              key={nft.mint}
              className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="font-medium">{nft.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[nft.category] ?? "bg-gray-500/10 text-gray-400"}`}>
                        {nft.category}
                      </span>
                      {nft.verified && (
                        <span className="text-xs text-teal-500 flex items-center gap-1">
                          ✓ AI verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-teal-400">{nft.amount} USDC</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Delivered in {nft.deliveredInHours}h
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
                <span>Minted {new Date(nft.mintedAt).toLocaleDateString()}</span>
                <div className="flex gap-3">
                  <a
                    href={`https://explorer.solana.com/address/${nft.mint}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> NFT on Solana
                  </a>
                  <a
                    href={`https://explorer.solana.com/tx/${nft.txSig}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Transaction
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portable rep explainer */}
      <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6">
        <h3 className="font-medium text-teal-400 mb-2">Why this reputation is different</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Every NFT above is a non-transferable soul-bound token on Solana.
          It lives in this wallet forever. No platform can delete it, hide it, or lock you out of it.
          Any client, employer, or platform can verify this track record by querying the chain —
          no login required.
        </p>
        <a
          href={`https://explorer.solana.com/address/${profile.wallet}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View on Solana Explorer
        </a>
      </div>
    </div>
  );
}
