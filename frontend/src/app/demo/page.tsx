"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Shield, AlertTriangle, Zap, Award, ExternalLink, ChevronRight } from "lucide-react";

// ─── Demo personas ────────────────────────────────────────────────────────────
const CLIENT     = { name: "Mark (US Client)",    wallet: "4xYz...9Abc", flag: "🇺🇸" };
const FREELANCER = { name: "Priya (IN Freelancer)", wallet: "7rWq...2Def", flag: "🇮🇳" };

const JOB = {
  title:       "Build Aqoryn landing page in React",
  description: "Mobile-first, Tailwind CSS, Phantom wallet connect, 3 sections",
  amount:      500,
  fee:         2.50,
  payout:      497.50,
  upworkFee:   100,
  deadline:    "2026-05-01",
  deliverables: [
    "Responsive homepage (mobile-first, Tailwind CSS)",
    "Phantom wallet connect button",
    "Live Vercel deployment",
  ],
};

// ─── Timeline steps definition ────────────────────────────────────────────────
type StepId = "created" | "locked" | "proof" | "ai" | "released" | "nft";

interface TimelineStep {
  id:       StepId;
  label:    string;
  sub:      string;
  icon:     any;
  color:    string;
  txHash?:  string;
  ipfsCid?: string;
  detail?:  string;
}

const STEPS: TimelineStep[] = [
  {
    id:    "created",
    label: "Job created",
    sub:   "Scope locked on-chain via IPFS",
    icon:  Shield,
    color: "teal",
    ipfsCid: "QmScopeCIDExampleAqorynTest12345678901234567890",
    detail: `Job ID: 550e8400-...\nClient: ${CLIENT.wallet}\nFreelancer: ${FREELANCER.wallet}\nDeadline: ${JOB.deadline}`,
  },
  {
    id:    "locked",
    label: "500 USDC locked",
    sub:   "Funds in escrow smart contract",
    icon:  Shield,
    color: "blue",
    txHash: "5KtP9xZab2C3D4E5F6G7H8I9J0K1",
    detail: `Amount: 500 USDC\nProgram: aqoryn-escrow\nState: Locked\nAuto-release: 48h after delivery`,
  },
  {
    id:    "proof",
    label: "Proof submitted",
    sub:   "Files + links uploaded to IPFS",
    icon:  CheckCircle,
    color: "purple",
    ipfsCid: "QmProofCIDExampleAqorynTest12345678901234567890x",
    txHash: "6LuQ0yAbc3D4E5F6G7H8I9J0K1L2",
    detail: `GitHub: github.com/priya/aqoryn-landing\nVercel: aqoryn-landing.vercel.app\nSubmitted: 2026-04-15 10:30 UTC`,
  },
  {
    id:    "ai",
    label: "AI verified (94%)",
    sub:   "3/3 deliverables confirmed",
    icon:  CheckCircle,
    color: "amber",
    detail: `Confidence: 94% (9400 bps)\n✓ GitHub repo exists (1.2MB, last push 2h ago)\n✓ Vercel URL returns HTTP 200\n✓ All 3 deliverable IDs covered\nReport hash: a3f4b2c1... (on-chain)`,
  },
  {
    id:    "released",
    label: "497.50 USDC released",
    sub:   "Auto-release after 48h silence",
    icon:  Zap,
    color: "green",
    txHash: "7MvR1zBcd4E5F6G7H8I9J0K1L2M3",
    detail: `Trigger: AutoRelease (48h elapsed)\nPayout: 497.50 USDC → Priya\nFee: 2.50 USDC → Treasury\nUpwork would have charged: $100`,
  },
  {
    id:    "nft",
    label: "Proof-of-Work NFT minted",
    sub:   "Portable reputation in Priya's wallet",
    icon:  Award,
    color: "pink",
    txHash: "8NwS2aCde5F6G7H8I9J0K1L2M3N4",
    detail: `NFT: AQPOW-#0007\nCategory: web-development\nAmount: 500 USDC\nDelivered in: 28h\nSoul-bound: non-transferable`,
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  teal:   { bg: "bg-teal-500/10",   border: "border-teal-500/30",   text: "text-teal-400",   icon: "text-teal-400" },
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   icon: "text-blue-400" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", icon: "text-purple-400" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  icon: "text-amber-400" },
  green:  { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  icon: "text-green-400" },
  pink:   { bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-400",   icon: "text-pink-400" },
  gray:   { bg: "bg-white/5",       border: "border-white/10",      text: "text-gray-400",   icon: "text-gray-600" },
};

type DemoState = "idle" | "running" | "done";

export default function DemoPage() {
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [activeStep,     setActiveStep]     = useState<StepId | null>(null);
  const [demoState,      setDemoState]      = useState<DemoState>("idle");
  const [expandedStep,   setExpandedStep]   = useState<StepId | null>(null);
  const [autoPlaying,    setAutoPlaying]    = useState(false);

  const currentStepIndex = STEPS.findIndex(s => !completedSteps.includes(s.id));

  function markComplete(id: StepId) {
    setActiveStep(null);
    setCompletedSteps(prev => [...prev, id]);
    setExpandedStep(id);
  }

  async function runStep(step: TimelineStep) {
    if (completedSteps.includes(step.id)) return;
    setActiveStep(step.id);
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
    markComplete(step.id);
    if (step.id === "nft") setDemoState("done");
  }

  async function runNextStep() {
    if (currentStepIndex < 0 || currentStepIndex >= STEPS.length) return;
    await runStep(STEPS[currentStepIndex]);
  }

  async function runAllSteps() {
    setAutoPlaying(true);
    for (let i = currentStepIndex; i < STEPS.length; i++) {
      await runStep(STEPS[i]);
      await new Promise(r => setTimeout(r, 400));
    }
    setAutoPlaying(false);
    setDemoState("done");
  }

  function reset() {
    setCompletedSteps([]);
    setActiveStep(null);
    setDemoState("idle");
    setExpandedStep(null);
  }

  const nextStep = currentStepIndex >= 0 && currentStepIndex < STEPS.length ? STEPS[currentStepIndex] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
          Interactive demo — no wallet required
        </span>
        <h1 className="text-4xl font-bold">See Aqoryn in action</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Priya (India) does $500 of work for Mark (US). Mark ghosts. Watch what happens.
        </p>
      </div>

      {/* Persona cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="text-3xl">{CLIENT.flag}</div>
          <div>
            <div className="font-medium">{CLIENT.name}</div>
            <div className="text-xs font-mono text-gray-500 mt-0.5">{CLIENT.wallet}</div>
            <div className="text-xs text-gray-500 mt-1">Locks 500 USDC · then goes silent</div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="text-3xl">{FREELANCER.flag}</div>
          <div>
            <div className="font-medium">{FREELANCER.name}</div>
            <div className="text-xs font-mono text-gray-500 mt-0.5">{FREELANCER.wallet}</div>
            <div className="text-xs text-gray-500 mt-1">Delivers all 3 items · gets paid automatically</div>
          </div>
        </div>
      </div>

      {/* Job summary */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">{JOB.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{JOB.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-teal-400">${JOB.amount}</div>
            <div className="text-xs text-gray-500">USDC locked</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
          {JOB.deliverables.map((d, i) => (
            <div key={i} className={`text-xs rounded-xl px-3 py-2 border transition-all ${
              completedSteps.includes("proof")
                ? "bg-teal-500/10 border-teal-500/20 text-teal-300"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}>
              {completedSteps.includes("proof") ? "✓ " : ""}{d}
            </div>
          ))}
        </div>
      </div>

      {/* Trust layer panel — visible after AI verification */}
      <AnimatePresence>
        {completedSteps.includes("ai") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h3 className="font-semibold text-amber-400">Trust layer — AI Verification Report</h3>
              <span className="ml-auto text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                On-chain hash
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-amber-400">94%</div>
                <div className="text-xs text-gray-500 mt-1">AI confidence</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-teal-400">3/3</div>
                <div className="text-xs text-gray-500 mt-1">Deliverables verified</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-400">PASS</div>
                <div className="text-xs text-gray-500 mt-1">GitHub + URL checks</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                { label: "Job ID match",              pass: true  },
                { label: "All deliverable IDs covered", pass: true  },
                { label: "No empty submissions",       pass: true  },
                { label: "GitHub repo exists (1.2MB)", pass: true  },
                { label: "Vercel URL → HTTP 200",     pass: true  },
                { label: "Submitted before deadline",  pass: true  },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-gray-400">
                  <span className={c.pass ? "text-teal-400" : "text-red-400"}>
                    {c.pass ? "✓" : "✗"}
                  </span>
                  {c.label}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-black/20 rounded-xl px-3 py-2">
              <span className="font-mono">Report hash: a3f4b2c1d5e6f7a8b9c0d1e2f3a4b5c6...</span>
              <span className="ml-auto text-teal-500">stored on Solana</span>
            </div>
            <p className="text-xs text-amber-400/70 italic">
              "AI cannot release funds. It only generates verifiable evidence." — Aqoryn protocol
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-widest">Transaction timeline</h2>
        {STEPS.map((step, i) => {
          const done     = completedSteps.includes(step.id);
          const active   = activeStep === step.id;
          const isNext   = i === currentStepIndex;
          const colors   = done ? COLOR_MAP[step.color] : COLOR_MAP.gray;
          const Icon     = step.icon;
          const expanded = expandedStep === step.id;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border rounded-2xl transition-all ${colors.border} ${colors.bg} ${isNext && !done ? "ring-1 ring-white/10" : ""}`}
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => done && setExpandedStep(expanded ? null : step.id)}
              >
                {/* Step number / icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? `${colors.bg} ${colors.border} border` : "bg-white/5 border border-white/10"
                }`}>
                  {active ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : done ? (
                    <Icon className={`w-4 h-4 ${colors.icon}`} />
                  ) : (
                    <span className="text-sm text-gray-600 font-medium">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${done ? colors.text : "text-gray-500"}`}>
                    {step.label}
                    {active && <span className="ml-2 text-xs text-gray-500 animate-pulse">processing…</span>}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{step.sub}</div>
                </div>

                <div className="flex items-center gap-2 text-right flex-shrink-0">
                  {step.txHash && done && (
                    <a
                      href={`https://explorer.solana.com/tx/${step.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-gray-600 hover:text-teal-400 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> tx
                    </a>
                  )}
                  {step.ipfsCid && done && (
                    <a
                      href={`https://nftstorage.link/ipfs/${step.ipfsCid}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-gray-600 hover:text-teal-400 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> ipfs
                    </a>
                  )}
                  {done && <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? "rotate-90" : ""}`} />}
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expanded && step.detail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <pre className={`mx-4 mb-4 px-4 py-3 text-xs rounded-xl bg-black/30 ${colors.text} font-mono whitespace-pre-wrap leading-relaxed`}>
                      {step.detail}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Control buttons */}
      <div className="space-y-3">
        {demoState !== "done" && (
          <div className="flex gap-3">
            <button
              onClick={runNextStep}
              disabled={!nextStep || autoPlaying || activeStep !== null}
              className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-400 disabled:bg-white/10 disabled:text-gray-600 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {activeStep ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Simulating…
                </>
              ) : nextStep ? (
                <>
                  Simulate: {nextStep.label} <ChevronRight className="w-4 h-4" />
                </>
              ) : "All done"}
            </button>
            <button
              onClick={runAllSteps}
              disabled={autoPlaying || activeStep !== null || demoState === "done"}
              className="px-6 py-3.5 border border-white/10 hover:border-white/20 disabled:opacity-40 rounded-xl transition-all text-sm text-gray-300 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Run all
            </button>
          </div>
        )}

        {demoState === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Result summary */}
            <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6 text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h3 className="text-xl font-bold text-teal-400">Priya got paid. Without chasing anyone.</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xl font-bold">$497.50</div>
                  <div className="text-xs text-gray-500">Priya received (USDC)</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">$2.50</div>
                  <div className="text-xs text-gray-500">Protocol fee (0.5%)</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-400 line-through">$100</div>
                  <div className="text-xs text-gray-500">Upwork would've charged</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Mark never responded. That didn't matter. The code handled it.
              </p>
              <blockquote className="text-sm font-medium text-teal-300 italic border-l-2 border-teal-500 pl-4 text-left">
                "We don't trust clients. We don't trust freelancers. We trust code."
              </blockquote>
            </div>

            <button
              onClick={reset}
              className="w-full py-3 border border-white/10 hover:border-white/20 rounded-xl text-gray-400 hover:text-white transition-all text-sm"
            >
              ↺ Reset demo
            </button>
          </motion.div>
        )}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 pr-4 text-gray-500 font-medium">Feature</th>
              <th className="text-center py-3 px-4 text-gray-500 font-medium">Upwork</th>
              <th className="text-center py-3 px-4 text-gray-500 font-medium">Fiverr</th>
              <th className="text-center py-3 px-4 text-teal-400 font-medium">Aqoryn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {[
              ["Platform fee",         "20%",  "20%",  "0.5%"],
              ["Escrow",               "✓",    "✓",    "✓"],
              ["Auto-release (silence)","✗",   "✗",    "✓ 48h"],
              ["AI proof verification","✗",    "✗",    "✓"],
              ["Portable reputation",  "✗",    "✗",    "✓ NFT"],
              ["No platform lock-in",  "✗",    "✗",    "✓"],
              ["Cross-border USDC",    "Fees", "Fees", "~$0"],
            ].map(([feat, up, fv, aq]) => (
              <tr key={feat}>
                <td className="py-3 pr-4 text-gray-400">{feat}</td>
                <td className="py-3 px-4 text-center text-gray-600">{up}</td>
                <td className="py-3 px-4 text-center text-gray-600">{fv}</td>
                <td className="py-3 px-4 text-center text-teal-400 font-medium">{aq}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
