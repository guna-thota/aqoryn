"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Shield, Clock, Upload, CheckCircle, AlertTriangle,
  ExternalLink, Zap, ChevronDown, ChevronUp
} from "lucide-react";
import toast from "react-hot-toast";
import { getStateLabel, getHoursUntilAutoRelease, calculateFee } from "@/lib/solana";
import type { Job } from "@/lib/constants";

const MOCK_JOB: Job = {
  jobId:       "550e8400-e29b-41d4-a716-446655440000",
  title:       "Build React landing page for Aqoryn",
  description: "Mobile-first landing page with Tailwind CSS. 3 sections: hero, features, CTA. Must integrate Phantom wallet connect.",
  amount:      500,
  client:      "ClientWaLLetAdDrEsS1234567890AbCdEf",
  freelancer:  "FrEeLaNcErWaLLetAdDrEsS1234567890xY",
  state:       "Delivered",
  ipfsScope:   "QmScopeCIDExampleAqorynTest12345678901234567890",
  ipfsProof:   "QmProofCIDExampleAqorynTest12345678901234567890x",
  deadline:    new Date(Date.now() + 7 * 24 * 3600_000),
  createdAt:   new Date(Date.now() - 3 * 24 * 3600_000),
  deliveredAt: new Date(Date.now() - 14 * 3600_000),
  aiVerified:  true,
  aiReport: {
    jobId:            "550e8400-e29b-41d4-a716-446655440000",
    deliverableCount: 3,
    verifiedCount:    3,
    missingItems:     [],
    confidence:       0.94,
    summary:          "All 3 deliverables verified. GitHub repo exists with 1.2MB content and recent commits. Vercel URL returns HTTP 200. All deliverable IDs covered.",
    reportHash:       "a3f4b2c1d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    generatedAt:      new Date(Date.now() - 13 * 3600_000).toISOString(),
  },
};

const MOCK_MILESTONES = [
  { index: 0, title: "Homepage + hero section",    amount: 200, completed: true  },
  { index: 1, title: "Features + CTA sections",    amount: 150, completed: false },
  { index: 2, title: "Phantom wallet integration", amount: 150, completed: false },
];

const DETERMINISTIC_CHECKS = [
  { label: "Job ID match",                   pass: true  },
  { label: "All deliverable IDs covered",    pass: true  },
  { label: "No empty submissions",           pass: true  },
  { label: "GitHub repo exists (1.2MB)",     pass: true  },
  { label: "Vercel URL → HTTP 200",          pass: true  },
  { label: "Submitted before deadline",      pass: true  },
];

type JobState = "Locked" | "Delivered" | "Released" | "Disputed" | "Refunded";

const STATE_CONFIG: Record<JobState, { label: string; color: string; bg: string }> = {
  Locked:    { label: "Funds locked",     color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  Delivered: { label: "Awaiting review",  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  Released:  { label: "Paid",             color: "text-teal-400",   bg: "bg-teal-500/10 border-teal-500/20" },
  Disputed:  { label: "In dispute",       color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  Refunded:  { label: "Refunded",         color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
};

export default function JobDetailPage({ params }: { params: { jobId: string } }) {
  const { publicKey } = useWallet();
  const [job, setJob]           = useState<Job>(MOCK_JOB);
  const [loading, setLoading]   = useState<string | null>(null);
  const [hoursLeft, setHoursLeft] = useState(0);
  const [showAI, setShowAI]     = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);

  const { fee, payout } = calculateFee(job.amount);
  const isClient     = publicKey?.toBase58() === job.client;
  const isFreelancer = publicKey?.toBase58() === job.freelancer;
  const cfg = STATE_CONFIG[job.state as JobState] ?? STATE_CONFIG.Locked;

  useEffect(() => {
    if (job.deliveredAt) setHoursLeft(getHoursUntilAutoRelease(job.deliveredAt));
  }, [job.deliveredAt]);

  async function simulate(action: string, newState: JobState, msg: string) {
    setLoading(action);
    await new Promise(r => setTimeout(r, 1400));
    setJob(j => ({ ...j, state: newState }));
    toast.success(msg);
    setLoading(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-gray-400 mt-1 text-sm leading-relaxed">{job.description}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Escrow status */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-teal-400" />
          <span className="font-medium text-sm">Escrow</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Locked</div>
            <div className="text-xl font-bold text-teal-400">{job.amount} USDC</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Freelancer gets</div>
            <div className="text-xl font-bold">{payout.toFixed(2)} USDC</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Protocol fee</div>
            <div className="text-xl font-bold text-gray-500">{fee.toFixed(2)} USDC</div>
          </div>
        </div>

        {job.state === "Delivered" && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
            hoursLeft > 0
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-teal-500/10 text-teal-400"
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            {hoursLeft > 0
              ? `Auto-release in ${hoursLeft.toFixed(1)}h if no action taken`
              : "48h window passed — auto-release ready to trigger"}
          </div>
        )}

        {job.state === "Released" && (
          <div className="flex items-center gap-2 text-sm text-teal-400 bg-teal-500/10 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4" />
            Funds released · freelancer received {payout.toFixed(2)} USDC
          </div>
        )}

        <div className="flex gap-3 text-xs text-gray-600 pt-1">
          <a href={`https://nftstorage.link/ipfs/${job.ipfsScope}`} target="_blank" rel="noreferrer"
             className="flex items-center gap-1 hover:text-teal-400 transition-colors">
            <ExternalLink className="w-3 h-3" /> Scope on IPFS
          </a>
          {job.ipfsProof && (
            <a href={`https://nftstorage.link/ipfs/${job.ipfsProof}`} target="_blank" rel="noreferrer"
               className="flex items-center gap-1 hover:text-teal-400 transition-colors">
              <ExternalLink className="w-3 h-3" /> Proof on IPFS
            </a>
          )}
        </div>
      </div>

      {/* Milestone tracker */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowMilestones(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
        >
          <span className="font-medium text-sm">Milestones (3)</span>
          {showMilestones ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {showMilestones && (
          <div className="px-6 pb-5 space-y-3">
            {MOCK_MILESTONES.map((m) => (
              <div key={m.index} className={`flex items-center justify-between p-3 rounded-xl border ${
                m.completed ? "bg-teal-500/5 border-teal-500/20" : "bg-white/3 border-white/10"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    m.completed ? "bg-teal-500 text-black" : "bg-white/10 text-gray-600"
                  }`}>
                    {m.completed ? "✓" : m.index + 1}
                  </div>
                  <span className={`text-sm ${m.completed ? "text-teal-300" : "text-gray-400"}`}>
                    {m.title}
                  </span>
                </div>
                <span className={`text-sm font-medium ${m.completed ? "text-teal-400" : "text-gray-500"}`}>
                  {m.amount} USDC
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Verification Report */}
      {job.aiReport && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAI(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <span className="font-medium text-sm">AI Verification Report</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                job.aiReport.verifiedCount === job.aiReport.deliverableCount
                  ? "bg-teal-500/10 text-teal-400"
                  : "bg-yellow-500/10 text-yellow-400"
              }`}>
                {job.aiReport.verifiedCount}/{job.aiReport.deliverableCount} verified
              </span>
            </div>
            {showAI ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {showAI && (
            <div className="px-6 pb-6 space-y-4">
              {/* Confidence bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>AI confidence</span>
                  <span>{Math.round(job.aiReport.confidence * 100)}% — above 75% threshold</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{ width: `${job.aiReport.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Deterministic checks */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Deterministic checks</p>
                {DETERMINISTIC_CHECKS.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={c.pass ? "text-teal-400" : "text-red-400"}>{c.pass ? "✓" : "✗"}</span>
                    {c.label}
                  </div>
                ))}
              </div>

              {/* AI summary */}
              <div className="bg-black/20 rounded-xl px-4 py-3 text-sm text-gray-300 leading-relaxed">
                {job.aiReport.summary}
              </div>

              {/* Report hash + links */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-black/20 rounded-xl px-3 py-2 font-mono">
                  <span className="truncate">Report hash: {job.aiReport.reportHash.slice(0, 32)}…</span>
                  <span className="ml-auto text-teal-600 flex-shrink-0">on-chain</span>
                </div>
                <p className="text-xs text-amber-400/70 italic px-1">
                  AI cannot release funds. It only generates verifiable evidence.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client actions */}
      {(isClient || !publicKey) && job.state === "Delivered" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-medium">Your action required</h3>
          <p className="text-sm text-gray-400">
            The freelancer submitted proof. AI confidence is{" "}
            <span className="text-teal-400 font-medium">94%</span> — above the 75% threshold.
            You have {hoursLeft.toFixed(0)}h to review. Silence = auto-release.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => simulate("dispute", "Disputed", "Dispute raised — arbitration opened")}
              disabled={!!loading}
              className="flex-1 py-3 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {loading === "dispute" ? "Raising…" : "Raise dispute"}
            </button>
            <button
              onClick={() => simulate("approve", "Released", `${payout.toFixed(2)} USDC released to freelancer`)}
              disabled={!!loading}
              className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {loading === "approve" ? "Releasing…" : `Approve & release ${payout.toFixed(2)} USDC`}
            </button>
          </div>
        </div>
      )}

      {/* Auto-release trigger */}
      {job.state === "Delivered" && hoursLeft === 0 && (
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-5">
          <p className="text-sm text-teal-400 mb-3">
            48h window closed · AI confidence ≥ 75% · no dispute raised.<br />
            Auto-release conditions met. Anyone can trigger this now.
          </p>
          <button
            onClick={() => simulate("auto", "Released", "Auto-release triggered — funds sent")}
            disabled={!!loading}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Zap className="w-4 h-4" />
            {loading === "auto" ? "Triggering…" : "Trigger auto-release"}
          </button>
        </div>
      )}

      {/* Freelancer: submit proof */}
      {(isFreelancer || !publicKey) && job.state === "Locked" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="font-medium">Submit your proof</h3>
          <p className="text-sm text-gray-400">
            Upload deliverables. AI will check GitHub repos, URLs, and scope coverage before the
            report is stored on-chain. Client has 48h to review.
          </p>
          <a href={`/jobs/${job.jobId}/submit-proof`}
             className="block w-full py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all text-center text-sm flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> Submit proof of delivery
          </a>
        </div>
      )}

      {/* Dispute state */}
      {job.state === "Disputed" && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-3">
          <h3 className="font-medium text-red-400">Dispute in arbitration</h3>
          <p className="text-sm text-gray-400">
            AQRN-staked jurors are reviewing the scope, proof, and AI report.
            Jurors stake tokens to vote — minority voters lose 20% of their stake (economic accountability).
            Resolution within 72 hours.
          </p>
          <div className="bg-black/20 rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Voting ends</span><span>72h from now</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Min jurors required</span><span>3</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Slash penalty (minority)</span><span>20% of stake</span>
            </div>
          </div>
        </div>
      )}

      {/* Released — show NFT */}
      {job.state === "Released" && (
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">🏆</div>
          <h3 className="font-semibold text-teal-400">Proof-of-Work NFT minted</h3>
          <p className="text-sm text-gray-400">
            A soul-bound NFT has been minted to the freelancer's wallet.
            It's permanent, non-transferable, and queryable by any future client.
          </p>
          <a href={`/profile/${job.freelancer}`}
             className="inline-block text-sm text-teal-400 hover:underline">
            View freelancer's reputation →
          </a>
        </div>
      )}
    </div>
  );
}
