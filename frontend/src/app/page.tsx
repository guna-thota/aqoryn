"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Zap, Award, ArrowRight, CheckCircle, Github } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const steps = [
  { icon: "🔒", label: "Client locks USDC",     sub: "Funds held in smart contract. Cannot withdraw." },
  { icon: "🛠️", label: "Freelancer delivers",   sub: "Upload proof to IPFS. Immutable record." },
  { icon: "🤖", label: "AI verifies delivery",  sub: "GitHub + URLs checked. Confidence scored." },
  { icon: "⚡", label: "Auto-release in 48h",   sub: "Silence = you get paid. Always." },
  { icon: "🏆", label: "NFT proof minted",       sub: "Portable reputation. No platform owns it." },
];

const stats = [
  { value: "0.5%",  label: "Protocol fee",       note: "vs 20% on Upwork" },
  { value: "48h",   label: "Auto-release",        note: "if client goes silent" },
  { value: "≥75%",  label: "AI confidence gate", note: "required for auto-release" },
  { value: "∞",     label: "Jurisdictions",       note: "USDC works everywhere" },
];

const comparisons = [
  ["Escrow",                   true,  true,  true ],
  ["Auto-release on silence",  false, false, true ],
  ["AI proof verification",    false, false, true ],
  ["Client acknowledgement",   false, false, true ],
  ["Milestone payments",       true,  false, true ],
  ["On-chain reputation NFT",  false, false, true ],
  ["0.5% fee",                 false, false, true ],
  ["No platform lock-in",      false, false, true ],
];

export default function HomePage() {
  return (
    <div className="space-y-28">

      {/* Hero */}
      <section className="text-center pt-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Solana Frontier Hackathon 2026
            </span>
            <a
              href="https://github.com/guna-thota/aqoryn"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 transition-all"
            >
              <Github className="w-3 h-3" /> View on GitHub
            </a>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Programmable trust layer<br />
            <span className="text-teal-400">for freelance payments.</span>
          </h1>
          <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Client locks USDC before work starts. Proof verified by AI. Funds auto-release in 48h.
            No chasing. No ghosting. No platform owning your reputation.
          </p>
          <blockquote className="mt-6 text-lg font-medium text-teal-300 italic">
            "We don't trust clients. We don't trust freelancers. We trust code."
          </blockquote>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/demo"
            className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all flex items-center gap-2 justify-center text-base"
          >
            <Zap className="w-4 h-4" /> See live demo
          </Link>
          <Link
            href="/jobs/create"
            className="px-8 py-3.5 border border-white/10 hover:border-white/20 rounded-xl transition-all text-gray-300 flex items-center gap-2 justify-center"
          >
            Post a job <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-teal-400">{s.value}</div>
            <div className="mt-1 font-medium text-sm">{s.label}</div>
            <div className="mt-1 text-xs text-gray-500">{s.note}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="flex flex-col md:flex-row gap-0 items-start justify-center">
          {steps.map((step, i) => (
            <div key={step.label} className="flex md:flex-col items-center gap-4 md:gap-2 flex-1">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-0 w-full md:justify-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {step.icon}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-teal-500/50 to-transparent mx-2" />
                )}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{step.label}</div>
                <div className="text-xs text-gray-500 mt-1 max-w-[120px] mx-auto">{step.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem vs solution */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
          <h3 className="font-semibold text-red-400 mb-4 text-lg">The problem today</h3>
          <ul className="space-y-3">
            {[
              "71% of freelancers have been ghosted on payment",
              "Invoice sits on read for 30, 60, 90 days",
              "Platform takes 20% of your income",
              "Dispute takes 3 weeks — you lose anyway",
              "5-star reviews locked on their servers forever",
              "No recourse across borders",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-8">
          <h3 className="font-semibold text-teal-400 mb-4 text-lg">With Aqoryn</h3>
          <ul className="space-y-3">
            {[
              "Funds locked before you write a single line of code",
              "Auto-release after 48h — money arrives without asking",
              "0.5% fee. Not 20%.",
              "AI-verified delivery creates immutable dispute evidence",
              "Client acknowledgement required — no blind auto-release",
              "Proof-of-work NFT in your wallet, not their database",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparison table */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8">How Aqoryn compares</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-gray-400 font-medium">Upwork</th>
                <th className="text-center py-4 px-4 text-gray-400 font-medium">Fiverr</th>
                <th className="text-center py-4 px-4 text-teal-400 font-semibold">Aqoryn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comparisons.map(([feat, up, fv, aq]) => (
                <tr key={String(feat)} className="hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-6 text-gray-300">{String(feat)}</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">{up ? "✓" : "✗"}</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">{fv ? "✓" : "✗"}</td>
                  <td className="py-3.5 px-4 text-center text-teal-400 font-medium">{aq ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI trust layer explainer */}
      <section className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 md:p-12">
        <div className="flex items-start gap-4">
          <div className="text-4xl flex-shrink-0">🤖</div>
          <div>
            <h3 className="text-xl font-bold mb-3">AI verification — but not how you think</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              Before Claude runs semantic verification, deterministic checks run first:
              GitHub repos are queried via API (does the repo exist? does it have commits?),
              URLs are pinged (HTTP 200?), and deliverable IDs are cross-referenced against the scope.
            </p>
            <p className="text-gray-400 leading-relaxed mb-4">
              The AI generates a confidence score (0–100%). Auto-release only triggers if confidence ≥ 75%.
              Below that, funds stay frozen for manual review.
            </p>
            <p className="text-sm font-medium text-amber-400 italic">
              "AI cannot release funds. It only generates verifiable evidence." — Aqoryn protocol
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center border border-white/10 rounded-3xl p-12 md:p-20 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="text-4xl font-bold mb-4">Try the live demo</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Watch Priya (India) get paid $497.50 for $500 of work — even after Mark (US) goes silent.
          No wallet required.
        </p>
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-10 py-4 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-all text-base"
        >
          <Zap className="w-5 h-5" /> Run the demo
        </Link>
        <p className="text-xs text-gray-600 mt-4">
          Or connect Phantom to use devnet with real USDC
        </p>
      </section>

    </div>
  );
}
