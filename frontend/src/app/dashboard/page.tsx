"use client";

import { useState } from "react";
const useWallet = () => ({ publicKey: null });
import Link from "next/link";
import { Clock, Shield, CheckCircle, AlertTriangle, Plus, ArrowRight } from "lucide-react";
import type { Job } from "@/lib/constants";
import { getStateLabel, getHoursUntilAutoRelease, calculateFee } from "@/lib/solana";

// Mock data — replace with real on-chain fetch
const MOCK_JOBS: Job[] = [
  {
    jobId:       "550e8400-e29b-41d4-a716-446655440000",
    title:       "React landing page for Aqoryn",
    description: "Mobile-first landing page with Phantom wallet integration",
    amount:      500,
    client:      "ClientWaLLetAdDrEsS1234567890AbCdEf",
    freelancer:  "FrEeLaNcErWaLLetAdDrEsS1234567890xY",
    state:       "Delivered",
    ipfsScope:   "QmScope1",
    deadline:    new Date(Date.now() + 7 * 86400_000),
    createdAt:   new Date(Date.now() - 3 * 86400_000),
    deliveredAt: new Date(Date.now() - 12 * 3600_000),
    aiVerified:  true,
  },
  {
    jobId:       "661f9511-f30c-52e5-b827-557766551111",
    title:       "Figma design system",
    description: "Component library for Aqoryn web app",
    amount:      800,
    client:      "ClientWaLLetAdDrEsS1234567890AbCdEf",
    freelancer:  "FrEeLaNcErWaLLetAdDrEsS1234567890xY",
    state:       "Locked",
    ipfsScope:   "QmScope2",
    deadline:    new Date(Date.now() + 14 * 86400_000),
    createdAt:   new Date(Date.now() - 1 * 86400_000),
  },
  {
    jobId:       "772g0622-g41d-63f6-c938-668877662222",
    title:       "Smart contract audit",
    description: "Security audit for escrow program",
    amount:      1500,
    client:      "ClientWaLLetAdDrEsS1234567890AbCdEf",
    freelancer:  "FrEeLaNcErWaLLetAdDrEsS1234567890xY",
    state:       "Released",
    ipfsScope:   "QmScope3",
    deadline:    new Date(Date.now() - 2 * 86400_000),
    createdAt:   new Date(Date.now() - 10 * 86400_000),
    deliveredAt: new Date(Date.now() - 3 * 86400_000),
    aiVerified:  true,
  },
];

const STATE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  Locked:    { icon: Shield,        color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  Delivered: { icon: Clock,         color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  Released:  { icon: CheckCircle,   color: "text-teal-400",   bg: "bg-teal-500/10 border-teal-500/20" },
  Disputed:  { icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  Refunded:  { icon: Shield,        color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
};

type Tab = "all" | "active" | "completed";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>("all");

  const walletAddr = publicKey?.toBase58() ?? "";

  const filtered = MOCK_JOBS.filter((j) => {
    if (tab === "active")    return ["Locked", "Delivered", "Disputed"].includes(j.state);
    if (tab === "completed") return ["Released", "Refunded"].includes(j.state);
    return true;
  });

  const activeCount    = MOCK_JOBS.filter((j) => ["Locked", "Delivered"].includes(j.state)).length;
  const totalEarned    = MOCK_JOBS.filter((j) => j.state === "Released").reduce((s, j) => s + j.amount * 0.995, 0);
  const pendingRelease = MOCK_JOBS.filter((j) => j.state === "Delivered").reduce((s, j) => s + j.amount, 0);

  if (!publicKey) {
    return (
      <div className="text-center py-24 space-y-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-bold">Connect your wallet</h2>
        <p className="text-gray-400">Connect Phantom to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            {walletAddr.slice(0, 8)}…{walletAddr.slice(-8)}
          </p>
        </div>
        <Link
          href="/jobs/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> New job
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-gray-500 mb-1">Active jobs</div>
          <div className="text-2xl font-bold">{activeCount}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-gray-500 mb-1">Pending release</div>
          <div className="text-2xl font-bold text-yellow-400">{pendingRelease} USDC</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-gray-500 mb-1">Total settled</div>
          <div className="text-2xl font-bold text-teal-400">{totalEarned.toFixed(0)} USDC</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["all", "active", "completed"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p>No jobs here yet.</p>
            <Link href="/jobs/create" className="text-teal-400 hover:underline text-sm mt-2 inline-block">
              Create your first job →
            </Link>
          </div>
        )}

        {filtered.map((job) => {
          const cfg          = STATE_CONFIG[job.state];
          const Icon         = cfg.icon;
          const isClient     = walletAddr === job.client;
          const isFreelancer = walletAddr === job.freelancer;
          const hoursLeft    = job.deliveredAt ? getHoursUntilAutoRelease(job.deliveredAt) : null;

          return (
            <Link
              key={job.jobId}
              href={`/jobs/${job.jobId}`}
              className="block bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{job.title}</h3>
                    {job.aiVerified && (
                      <span className="text-xs text-teal-500">🤖 AI verified</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-1">{job.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span>Created {job.createdAt.toLocaleDateString()}</span>
                    {isClient     && <span className="text-blue-400">You are client</span>}
                    {isFreelancer && <span className="text-purple-400">You are freelancer</span>}
                    {job.state === "Delivered" && hoursLeft !== null && (
                      <span className="text-yellow-500">
                        Auto-release in {hoursLeft.toFixed(0)}h
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <div className="font-semibold">{job.amount} USDC</div>
                    <div className={`mt-1 text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} inline-flex items-center gap-1`}>
                      <Icon className="w-3 h-3" />
                      {getStateLabel(job.state)}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
