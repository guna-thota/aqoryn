"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Clock, Shield, AlertTriangle, Zap, Award,
  ExternalLink, ChevronRight, Github, Play, RotateCcw,
  Lock, FileCheck, Coins
} from "lucide-react";

const CLIENT     = { name: "Mark", role: "US Client",      wallet: "4xYz...9Abc", flag: "🇺🇸" };
const FREELANCER = { name: "Priya", role: "IN Freelancer", wallet: "7rWq...2Def", flag: "🇮🇳" };

type ScenarioId = "success" | "dispute" | "fraud";

const SCENARIOS: Record<ScenarioId, { label: string; icon: string; color: string; description: string }> = {
  success: { label: "Successful payment", icon: "✅", color: "teal",  description: "Client goes silent → auto-release after 48h" },
  dispute: { label: "Dispute raised",     icon: "⚠️", color: "amber", description: "Client disputes → DAO arbitration → freelancer wins" },
  fraud:   { label: "Fraud attempt",      icon: "🚨", color: "red",   description: "Fake proof submitted → AI flags → funds frozen" },
};

interface Step { id: string; label: string; sub: string; color: string; detail: string; trustDelta: number; txHash?: string; }

const SUCCESS_STEPS: Step[] = [
  { id: "created", label: "Job created",          sub: "Scope locked on IPFS",            color: "blue",   detail: "Job ID: 550e8400\nClient: 4xYz...9Abc\nFreelancer: 7rWq...2Def\nDeadline: 2026-05-01", trustDelta: 10, txHash: "5KtP9xZab2C" },
  { id: "locked",  label: "500 USDC locked",      sub: "Funds in escrow smart contract",  color: "blue",   detail: "Amount: 500 USDC\nState: Locked\nAuto-release: 48h after delivery\nVault: PDA verified", trustDelta: 20, txHash: "6LuQ0yAbc3D" },
  { id: "proof",   label: "Proof submitted",       sub: "GitHub + Vercel URL on IPFS",    color: "purple", detail: "github.com/priya/aqoryn-landing ✓\naqoryn-landing.vercel.app ✓\nSubmitted: 2026-04-15 10:30 UTC", trustDelta: 15, txHash: "7MvR1zBcd4E" },
  { id: "ai",      label: "AI verified — 94%",    sub: "3/3 deliverables confirmed",      color: "amber",  detail: "✓ GitHub repo exists (1.2MB, last push 2h ago)\n✓ Vercel URL → HTTP 200\n✓ All 3 deliverable IDs covered\nReport hash: a3f4b2c1... (on-chain)", trustDelta: 25 },
  { id: "release", label: "497.50 USDC released", sub: "Auto-release after 48h silence", color: "green",  detail: "Trigger: AutoRelease\nPayout: 497.50 USDC → Priya\nFee: 2.50 USDC (0.5%)\nUpwork would've charged: $100", trustDelta: 20, txHash: "8NwS2aCde5F" },
  { id: "nft",     label: "NFT minted",           sub: "Portable proof-of-work in wallet",color: "pink",   detail: "AQPOW-#0007\nCategory: web-development\n500 USDC · Delivered in 28h\nSoul-bound: non-transferable", trustDelta: 10, txHash: "9OxT3bDef6G" },
];

const DISPUTE_STEPS: Step[] = [
  { id: "created", label: "Job created",          sub: "Scope locked on IPFS",             color: "blue",  detail: "Job ID: 661f9511\nAmount: 800 USDC", trustDelta: 10, txHash: "Ax1B2C3D4E5" },
  { id: "locked",  label: "800 USDC locked",      sub: "Funds in escrow smart contract",   color: "blue",  detail: "State: Locked\nAuto-release: 48h after delivery", trustDelta: 20 },
  { id: "proof",   label: "Proof submitted",       sub: "Deliverables uploaded",            color: "purple",detail: "Figma link submitted\nPrototype URL provided", trustDelta: 15 },
  { id: "ai",      label: "AI verified — 78%",    sub: "2/3 deliverables confirmed",       color: "amber", detail: "✓ Figma link exists\n✓ Prototype URL reachable\n⚠ Mobile version not confirmed\nRouted to human review", trustDelta: 10 },
  { id: "dispute", label: "Client disputes",       sub: "Within 48h window",                color: "red",   detail: "Reason: Mobile version missing\nFunds frozen pending arbitration\n3 jurors assigned (staked AQRN)", trustDelta: -5 },
  { id: "dao",     label: "DAO votes — 2:1",       sub: "Freelancer wins arbitration",      color: "amber", detail: "Votes: 2 freelancer / 1 client\nMinority juror slashed 20% stake\n72h resolution time", trustDelta: 15 },
  { id: "release", label: "794 USDC released",     sub: "Arbitration payout to freelancer", color: "green", detail: "Payout: 794 USDC → Priya\nFee: 4 USDC (0.5%)\nMinority juror lost: 20 AQRN", trustDelta: 15 },
];

const FRAUD_STEPS: Step[] = [
  { id: "created", label: "Job created",          sub: "Scope locked on IPFS",             color: "blue",  detail: "Job ID: 772g0622\nAmount: 1200 USDC", trustDelta: 10 },
  { id: "locked",  label: "1200 USDC locked",     sub: "Funds in escrow",                  color: "blue",  detail: "State: Locked", trustDelta: 15 },
  { id: "proof",   label: "Suspicious proof",      sub: "Empty GitHub repo submitted",      color: "red",   detail: "github.com/bad-actor/fake-repo\nRepo size: 0KB\nLast push: never", trustDelta: -10 },
  { id: "ai",      label: "AI flags — 12%",        sub: "Deterministic checks FAILED",      color: "red",   detail: "✗ GitHub repo empty (0KB)\n✗ No commits found\n✗ Live URL not reachable\nConfidence: 12% — BLOCKED", trustDelta: -20 },
  { id: "frozen",  label: "Funds frozen",          sub: "Auto-release BLOCKED",             color: "red",   detail: "AI confidence 12% < 75% threshold\nAuto-release DENIED\nDispute triggered automatically", trustDelta: 0 },
  { id: "refund",  label: "Client refunded",       sub: "1200 USDC returned to client",    color: "green", detail: "Fraudulent delivery rejected\nFull refund: 1200 USDC → Mark\nBad actor flagged on-chain", trustDelta: 20 },
];

const SCENARIO_STEPS: Record<ScenarioId, Step[]> = { success: SUCCESS_STEPS, dispute: DISPUTE_STEPS, fraud: FRAUD_STEPS };

const C: Record<string, { bg: string; border: string; text: string }> = {
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400"   },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400"  },
  green:  { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400"  },
  pink:   { bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-400"   },
  red:    { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400"    },
  teal:   { bg: "bg-teal-500/10",   border: "border-teal-500/30",   text: "text-teal-400"   },
  gray:   { bg: "bg-white/5",       border: "border-white/10",      text: "text-gray-500"   },
};

export default function DemoPage() {
  const [scenario, setScenario]   = useState<ScenarioId>("success");
  const [completed, setCompleted] = useState<string[]>([]);
  const [active, setActive]       = useState<string | null>(null);
  const [done, setDone]           = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [trustScore, setTrustScore]   = useState(30);

  const steps   = SCENARIO_STEPS[scenario];
  const nextIdx = steps.findIndex(s => !completed.includes(s.id));
  const nextStep = nextIdx >= 0 ? steps[nextIdx] : null;

  async function runStep(step: Step) {
    if (completed.includes(step.id)) return;
    setActive(step.id);
    await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
    setActive(null);
    setCompleted(p => [...p, step.id]);
    setExpanded(step.id);
    setTrustScore(s => Math.min(100, Math.max(0, s + step.trustDelta)));
    if (steps[steps.length - 1].id === step.id) setDone(true);
  }

  async function runAll() {
    setAutoRunning(true);
    for (let i = nextIdx; i < steps.length; i++) {
      await runStep(steps[i]);
      await new Promise(r => setTimeout(r, 250));
    }
    setAutoRunning(false);
  }

  function reset() {
    setCompleted([]); setActive(null); setDone(false);
    setExpanded(null); setAutoRunning(false); setTrustScore(30);
  }

  function changeScenario(s: ScenarioId) { setScenario(s); reset(); }

  const trustColor = trustScore >= 75 ? "text-green-400" : trustScore >= 50 ? "text-amber-400" : "text-red-400";
  const trustBg    = trustScore >= 75 ? "bg-green-500"   : trustScore >= 50 ? "bg-amber-500"   : "bg-red-500";
  const riskLabel  = trustScore >= 75 ? "Low"            : trustScore >= 50 ? "Medium"          : "High";

  return (
    <div className="min-h-screen">

      {/* HERO */}
      <section className="text-center pt-14 pb-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-5">
            ⚡ Interactive demo — no wallet required · Solana Frontier Hackathon
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">Aqoryn</span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-white mb-2">Trust Infrastructure for Freelance Payments</p>
          <p className="text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed text-sm md:text-base">
            Eliminate payment fraud with real-time escrow, AI verification, and smart auto-release. Built on Solana. No middleman. 0.5% fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={runAll} disabled={autoRunning || done}
              className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 text-black font-bold rounded-xl transition-all flex items-center gap-2 justify-center">
              <Play className="w-4 h-4" /> Run Live Demo
            </button>
            <a href="https://github.com/guna-thota/aqoryn" target="_blank" rel="noreferrer"
              className="px-8 py-3.5 border border-white/10 hover:border-white/30 rounded-xl text-gray-300 flex items-center gap-2 justify-center transition-all">
              <Github className="w-4 h-4" /> View on GitHub
            </a>
          </div>
        </motion.div>
      </section>

      {/* PROBLEM */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold mb-1">The problem is real</h2>
          <p className="text-gray-400 text-sm">Every day, freelancers deliver work and never see a cent.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { icon: "💸", stat: "71%",     label: "of freelancers ghosted on payment at least once",      col: "red"   },
            { icon: "⏳", stat: "44 days",  label: "average payment delay for independent contractors",    col: "amber" },
            { icon: "💰", stat: "$250B",    label: "lost annually to freelance payment failures globally", col: "red"   },
          ].map(c => (
            <div key={c.stat} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className={`text-3xl font-bold mb-2 ${c.col === "red" ? "text-red-400" : "text-amber-400"}`}>{c.stat}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-gray-300 text-sm leading-relaxed">
            Platforms charge <span className="text-white font-semibold">20%</span> to own trust. When trust fails, you lose.
            <span className="text-teal-400 font-semibold"> Aqoryn removes trust from the equation entirely.</span>
          </p>
        </div>
      </section>

      {/* MAIN DEMO */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold mb-1">Select a scenario</h2>
          <p className="text-gray-400 text-sm">Aqoryn handles every outcome — not just the happy path.</p>
        </div>

        {/* Scenario selector */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          {(Object.entries(SCENARIOS) as [ScenarioId, typeof SCENARIOS[ScenarioId]][]).map(([id, s]) => {
            const active = scenario === id;
            const borderActive = s.color === "teal" ? "border-teal-500/50 bg-teal-500/10" : s.color === "amber" ? "border-amber-500/50 bg-amber-500/10" : "border-red-500/50 bg-red-500/10";
            return (
              <button key={id} onClick={() => changeScenario(id)}
                className={`p-4 rounded-2xl border text-left transition-all ${active ? borderActive : "bg-white/5 border-white/10 hover:border-white/20"}`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{s.description}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left panel */}
          <div className="space-y-4">
            {/* Personas */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Parties</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{CLIENT.flag}</div>
                  <div><div className="font-medium text-sm">{CLIENT.name}</div><div className="text-xs text-gray-500">{CLIENT.role} · {CLIENT.wallet}</div></div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{FREELANCER.flag}</div>
                  <div><div className="font-medium text-sm">{FREELANCER.name}</div><div className="text-xs text-gray-500">{FREELANCER.role} · {FREELANCER.wallet}</div></div>
                </div>
              </div>
            </div>

            {/* Trust score */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Trust metrics</p>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">Trust score</span>
                  <span className={`text-xl font-bold ${trustColor}`}>{trustScore}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <motion.div className={`h-2 rounded-full ${trustBg}`} animate={{ width: `${trustScore}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <div className={`text-sm font-semibold ${trustColor}`}>{riskLabel}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Risk level</div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <div className="text-sm font-semibold text-teal-400">{completed.length}/{steps.length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Steps done</div>
                </div>
              </div>
              {active && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2">
                  <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  Processing on Solana devnet…
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              {!done && (
                <>
                  <button onClick={() => nextStep && runStep(nextStep)} disabled={!nextStep || autoRunning || !!active}
                    className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-white/10 disabled:text-gray-600 text-black font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                    {active
                      ? <><div className="w-3 h-3 border-2 border-black/40 border-t-black rounded-full animate-spin" />Processing…</>
                      : nextStep ? <><ChevronRight className="w-4 h-4" />Next step</> : "All done"}
                  </button>
                  <button onClick={runAll} disabled={autoRunning || !!active || done}
                    className="w-full py-2.5 border border-white/10 hover:border-white/20 disabled:opacity-40 rounded-xl text-sm text-gray-400 flex items-center justify-center gap-2 transition-all">
                    <Zap className="w-3.5 h-3.5" /> Run all steps
                  </button>
                </>
              )}
              <button onClick={reset}
                className="w-full py-2.5 border border-white/10 hover:border-red-500/30 rounded-xl text-sm text-gray-500 hover:text-red-400 flex items-center justify-center gap-2 transition-all">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Transaction timeline</p>
            {steps.map((step, i) => {
              const isDone     = completed.includes(step.id);
              const isActive   = active === step.id;
              const isNext     = i === nextIdx;
              const isExpanded = expanded === step.id;
              const safeColorKey = step.color && C[step.color] ? step.color : "gray";
              const colors = isDone ? (C[step.color] ?? C.gray) : C.gray;
              return (
                <motion.div key={step.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`border rounded-xl transition-all ${colors.border} ${colors.bg} ${isNext && !isDone ? "ring-1 ring-white/10" : ""}`}>
                  <div className="flex items-center gap-3 p-3.5 cursor-pointer" onClick={() => isDone && setExpanded(isExpanded ? null : step.id)}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-medium transition-all ${isDone ? `${colors.bg} border ${colors.border}` : "bg-white/5 border border-white/10"}`}>
                      {isActive ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                       : isDone ? <span className={colors.text}>✓</span>
                       : <span className="text-gray-600">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isDone ? colors.text : "text-gray-500"}`}>
                        {step.label}{isActive && <span className="ml-2 text-xs text-gray-500 animate-pulse">processing…</span>}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{step.sub}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {step.txHash && isDone && (
                        <a href={`https://explorer.solana.com/tx/${step.txHash}?cluster=devnet`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} className="text-xs text-gray-600 hover:text-teal-400 flex items-center gap-1 transition-colors">
                          <ExternalLink className="w-3 h-3" />tx
                        </a>
                      )}
                      {isDone && <ChevronRight className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <pre className={`mx-3 mb-3 px-3 py-2.5 text-xs rounded-lg bg-black/30 ${colors.text} font-mono whitespace-pre-wrap leading-relaxed`}>
                          {step.detail}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Result card */}
            <AnimatePresence>
              {done && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                  {scenario === "success" && (
                    <div className="bg-teal-500/5 border border-teal-500/30 rounded-2xl p-6 text-center space-y-4">
                      <div className="text-4xl">🎉</div>
                      <h3 className="text-xl font-bold text-teal-400">Priya got paid. Without chasing anyone.</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-black/20 rounded-xl p-3"><div className="text-lg font-bold text-teal-400">$497.50</div><div className="text-xs text-gray-500 mt-0.5">Priya received</div></div>
                        <div className="bg-black/20 rounded-xl p-3"><div className="text-lg font-bold text-green-400">$2.50</div><div className="text-xs text-gray-500 mt-0.5">Protocol fee (0.5%)</div></div>
                        <div className="bg-black/20 rounded-xl p-3"><div className="text-lg font-bold text-red-400 line-through">$100</div><div className="text-xs text-gray-500 mt-0.5">Upwork would charge</div></div>
                      </div>
                      <p className="text-sm text-teal-300 italic">"Mark never responded. That didn't matter. The code handled it."</p>
                    </div>
                  )}
                  {scenario === "dispute" && (
                    <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
                      <div className="text-4xl">⚖️</div>
                      <h3 className="text-xl font-bold text-amber-400">Dispute resolved. Freelancer wins.</h3>
                      <p className="text-sm text-gray-400">DAO jurors reviewed evidence. 2 voted for Priya, 1 for Mark. Minority juror lost 20% stake. Economic accountability at every layer.</p>
                    </div>
                  )}
                  {scenario === "fraud" && (
                    <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
                      <div className="text-4xl">🛡️</div>
                      <h3 className="text-xl font-bold text-red-400">Fraud detected. Client protected.</h3>
                      <p className="text-sm text-gray-400">AI confidence 12% — below the 75% threshold. Auto-release blocked automatically. 1200 USDC returned to Mark in full.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold mb-1">System architecture</h2>
          <p className="text-gray-400 text-sm">Three smart contract programs. One trust layer.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {[
            { icon: <Lock className="w-5 h-5" />,    name: "aqoryn-escrow",      color: "blue",   desc: "State machine: lock → deliver → release/dispute. Auto-release requires proof + AI ≥ 75%." },
            { icon: <Award className="w-5 h-5" />,   name: "aqoryn-reputation",  color: "purple", desc: "Soul-bound proof-of-work NFT on completion. Non-transferable. Queryable by anyone on-chain." },
            { icon: <Shield className="w-5 h-5" />,  name: "aqoryn-arbitration", color: "amber",  desc: "DAO voting with staked AQRN. Minority voters slashed 20%. 72-hour resolution window." },
          ].map(p => (
            <div key={p.name} className={`${C[p.color].bg} border ${C[p.color].border} rounded-2xl p-5`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${C[p.color].bg} ${C[p.color].text}`}>{p.icon}</div>
              <div className={`font-mono text-sm font-medium ${C[p.color].text} mb-2`}>{p.name}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{p.desc}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">AI verification pipeline</p>
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            {[
              { label: "Tier 1: Deterministic", sub: "GitHub API · URL pings", color: "teal"   },
              { label: "Tier 2: AI semantic",   sub: "Claude · confidence",    color: "amber"  },
              { label: "Tier 3: Human review",  sub: "Staked AQRN · quality",  color: "purple" },
              { label: "Smart contract",        sub: "Auto-release / dispute", color: "blue"   },
            ].map((node, i) => (
              <div key={node.label} className="flex md:flex-row flex-col items-center flex-1">
                <div className={`flex-1 ${C[node.color].bg} border ${C[node.color].border} rounded-xl p-3 text-center w-full`}>
                  <div className={`font-medium text-xs ${C[node.color].text}`}>{node.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{node.sub}</div>
                </div>
                {i < 3 && <div className="text-gray-700 mx-1.5 my-1 md:my-0 text-xs">→</div>}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-400/70 italic mt-3 text-center">"AI cannot release funds. It only generates verifiable evidence."</p>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold mb-1">How Aqoryn compares</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left py-4 px-5 text-gray-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-gray-500 font-medium">Upwork</th>
                <th className="text-center py-4 px-4 text-gray-500 font-medium">Fiverr</th>
                <th className="text-center py-4 px-4 text-teal-400 font-semibold bg-teal-500/5 border-x border-teal-500/20">Aqoryn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ["Platform fee",            "20%",  "20%",  "0.5%"  ],
                ["Escrow",                  "✓",    "✓",    "✓"     ],
                ["Auto-release on silence", "✗",    "✗",    "✓ 48h" ],
                ["AI proof verification",   "✗",    "✗",    "✓"     ],
                ["Human review layer",      "✗",    "✗",    "✓"     ],
                ["Milestone payments",      "✓",    "✗",    "✓"     ],
                ["Portable reputation NFT", "✗",    "✗",    "✓"     ],
                ["No platform lock-in",     "✗",    "✗",    "✓"     ],
                ["Cross-border USDC",       "Fees", "Fees", "~$0"   ],
              ].map(([f, up, fv, aq]) => (
                <tr key={String(f)} className="hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-5 text-gray-300">{f}</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">{up}</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">{fv}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-teal-400 bg-teal-500/5 border-x border-teal-500/10">{aq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* USE CASES */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold mb-1">Who is this for</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "👩‍💻", label: "Freelancers",      sub: "Fiverr, Upwork, direct"   },
            { icon: "🏢",   label: "Agencies",          sub: "Contract dev shops"       },
            { icon: "🌍",   label: "Cross-border",      sub: "India → US, PH → EU"      },
            { icon: "🤝",   label: "Remote hiring",     sub: "Contract developers"      },
          ].map(u => (
            <div key={u.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-3">{u.icon}</div>
              <div className="font-medium text-sm">{u.label}</div>
              <div className="text-xs text-gray-500 mt-1">{u.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center border border-white/10 rounded-3xl p-12 bg-gradient-to-b from-teal-500/5 to-transparent">
          <h2 className="text-3xl font-bold mb-3">Ready to build trust in digital work?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            Built for the Solana Frontier Hackathon · $250K pre-seed on the line · Open source · No signup required
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={reset}
              className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-all flex items-center gap-2 justify-center">
              <Play className="w-4 h-4" /> Try the demo
            </button>
            <a href="https://github.com/guna-thota/aqoryn" target="_blank" rel="noreferrer"
              className="px-8 py-3.5 border border-white/10 hover:border-white/30 rounded-xl text-gray-300 flex items-center gap-2 justify-center transition-all">
              <Github className="w-4 h-4" /> View GitHub
            </a>
          </div>
          <p className="text-xs text-gray-600 mt-6 italic">"We don't trust clients. We don't trust freelancers. We trust code."</p>
        </div>
      </section>

    </div>
  );
}
