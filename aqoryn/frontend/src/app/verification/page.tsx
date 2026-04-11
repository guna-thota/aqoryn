"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const TIERS = [
  {
    number: "1",
    name:   "Deterministic checks",
    tag:    "No AI. No subjectivity. Ungameable.",
    color:  "teal",
    icon:   "⚙️",
    checks: [
      { label: "GitHub repo exists",      detail: "Calls GitHub API — confirms repo is public, has content (size > 0), has recent commits. A freelancer cannot fake this." },
      { label: "URL returns HTTP 200",    detail: "HEAD request to every submitted link. Vercel/Netlify/live deployments must actually respond. Dead links fail immediately." },
      { label: "All deliverable IDs covered", detail: "Cross-references scope IDs vs proof IDs. If the scope listed 3 deliverables and proof only addresses 2, this fails." },
      { label: "No empty submissions",    detail: "Every proof item must have non-empty content. Blank submissions are caught before AI even runs." },
      { label: "Submitted before deadline", detail: "Timestamp on proof vs agreed deadline. Late submissions are flagged in the report." },
    ],
    verdict: "If any check fails: confidence is penalised. Auto-release is blocked.",
    cost:  "~$0 · < 2 seconds",
  },
  {
    number: "2",
    name:   "AI semantic verification",
    tag:    "Completeness, not quality.",
    color:  "amber",
    icon:   "🤖",
    checks: [
      { label: "Does proof match scope description?", detail: "Claude reads both documents and asks: does this proof address what was agreed? A GitHub link to a mobile app does not satisfy a scope asking for a Figma design." },
      { label: "Per-deliverable verdict",             detail: "Each deliverable gets verified: true/false with a one-sentence reason. This is what shows in the trust layer panel." },
      { label: "Confidence score 0–100%",             detail: "Overall confidence based on how clearly the proof covers the scope. Uncertain items lower the score." },
      { label: "Missing items report",                detail: "Lists anything in the scope that wasn't addressed in the proof. Goes into the on-chain report hash." },
    ],
    verdict: "≥85%: auto-release. 75–85%: human review. <60%: dispute triggered.",
    important: "AI cannot release funds. It only generates verifiable evidence.",
    cost: "~$0.01/verification · 3–8 seconds",
  },
  {
    number: "3",
    name:   "Human review (staked)",
    tag:    "Quality. Judgment. Economic accountability.",
    color:  "purple",
    icon:   "👤",
    checks: [
      { label: "AI-generated reviewer briefing",    detail: "Before the reviewer sees the job, Claude generates a 200-word brief: what to check, what AI was uncertain about, red flags. Reviewer reads this first — saves 10 minutes." },
      { label: "Quality scoring (1–5 per item)",    detail: "Human reviewers can assess quality — is this landing page actually good? AI cannot do this. Reviewer rates each deliverable 1–5." },
      { label: "Staked verdict (AQRN)",             detail: "Reviewer stakes AQRN tokens before submitting verdict. If their verdict disagrees with majority → 20% of stake slashed. Honest review = bounty earned." },
      { label: "Blended final score",               detail: "Final confidence = human × 60% + AI × 40%. Human is authoritative on quality. AI is authoritative on completeness. Neither alone is sufficient." },
    ],
    triggered: "AI confidence 75–85% OR job value ≥ $1,000",
    verdict: "Human verdict overrides AI for quality. Slashing prevents lazy reviews.",
    cost: "0.5–1% bounty paid to reviewer · up to 24 hours",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  teal:   { bg: "bg-teal-500/5",   border: "border-teal-500/20",   text: "text-teal-400",   badge: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  amber:  { bg: "bg-amber-500/5",  border: "border-amber-500/20",  text: "text-amber-400",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  purple: { bg: "bg-purple-500/5", border: "border-purple-500/20", text: "text-purple-400", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

const ROUTING_ROWS = [
  { condition: "AI ≥ 85% + all deterministic pass", route: "Auto-release",  color: "teal",   icon: "⚡" },
  { condition: "AI 75–85%",                          route: "Human review", color: "amber",  icon: "👤" },
  { condition: "Job value ≥ $1,000",                 route: "Human review", color: "amber",  icon: "👤" },
  { condition: "AI < 60%",                           route: "Dispute / DAO", color: "red",   icon: "⚖️" },
];

const FAQS = [
  {
    q: "What if AI is wrong?",
    a: "That's exactly what tier 3 is for. When AI confidence is below 85%, a human reviewer is assigned. They're staked — if they vote against majority they lose 20% of their AQRN. Wrong AI + honest human reviewer = correct outcome.",
  },
  {
    q: "Can a freelancer game the AI?",
    a: "Tier 1 deterministic checks catch the obvious attacks: fake GitHub links, dead URLs, missing deliverable IDs. Tier 2 AI can be partially fooled by elaborate fake submissions, but not combined with tier 1. And any job over $1,000 goes to human review regardless.",
  },
  {
    q: "Why not always use human review?",
    a: "Cost and speed. 95% of freelance jobs are under $500 with clear deliverables — a GitHub repo link + a live URL. Tier 1 + tier 2 handles this in 10 seconds for $0.01. Human review is for edge cases, not every job.",
  },
  {
    q: "Who are the human reviewers?",
    a: "AQRN token stakers who opt in to the reviewer pool. They're domain-specific — a Solana dev reviews smart contract jobs, a designer reviews Figma jobs. Matching is by category. Reviewers earn bounties (0.5–1% of job value) for honest verdicts.",
  },
  {
    q: "What happens if human and AI disagree?",
    a: "Human takes precedence (60% weight in the blend). But a strong AI-human disagreement triggers a warning flag. If AI was 90% confident and human rejects, the system asks the reviewer to provide detailed justification. Extreme disagreements escalate to DAO.",
  },
  {
    q: "Is the AI report stored on-chain?",
    a: "The SHA-256 hash of the full report is stored on-chain. Anyone can reconstruct the report from IPFS and verify the hash matches. The on-chain record is the commitment — the full report lives off-chain.",
  },
];

export default function VerificationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openCheck, setOpenCheck] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto space-y-12">

      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-400">
          For judges · technical deep dive
        </span>
        <h1 className="text-4xl font-bold">3-tier hybrid verification</h1>
        <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
          AI alone is not enough. Neither is human alone. Aqoryn combines deterministic checks,
          AI semantic verification, and staked human review — each tier catching what the others miss.
        </p>
        <p className="text-sm font-medium text-amber-400 italic">
          "AI cannot release funds. It only generates verifiable evidence."
        </p>
      </div>

      {/* Tier cards */}
      {TIERS.map((tier, i) => {
        const c = COLOR_MAP[tier.color];
        return (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`border rounded-2xl overflow-hidden ${c.border} ${c.bg}`}
          >
            {/* Header */}
            <div className="px-6 py-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border ${c.border} bg-black/20`}>
                {tier.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${c.badge}`}>
                    Tier {tier.number}
                  </span>
                  <h2 className={`font-semibold ${c.text}`}>{tier.name}</h2>
                </div>
                <p className="text-sm text-gray-400 mt-1">{tier.tag}</p>
                {tier.triggered && (
                  <p className="text-xs text-gray-500 mt-1">Triggered when: {tier.triggered}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-gray-600">{tier.cost}</div>
              </div>
            </div>

            {/* Checks */}
            <div className="px-6 pb-2 space-y-1">
              {tier.checks.map((check) => {
                const key     = `${tier.name}-${check.label}`;
                const isOpen  = openCheck === key;
                return (
                  <div key={check.label}>
                    <button
                      onClick={() => setOpenCheck(isOpen ? null : key)}
                      className="w-full flex items-center gap-2 py-2 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className={`text-xs ${c.text}`}>✓</span>
                      <span className="text-sm text-gray-300 flex-1">{check.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-gray-500 pb-3 pl-5 leading-relaxed">{check.detail}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 mt-2 border-t ${c.border} bg-black/10 space-y-1`}>
              <p className="text-xs text-gray-400">{tier.verdict}</p>
              {tier.important && (
                <p className={`text-xs font-medium italic ${c.text}`}>{tier.important}</p>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Routing table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Routing logic</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {ROUTING_ROWS.map((row, i) => (
            <div
              key={row.condition}
              className={`flex items-center justify-between px-5 py-4 ${i < ROUTING_ROWS.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <span className="text-sm text-gray-400">{row.condition}</span>
              <span className={`text-sm font-medium flex items-center gap-1.5 ${
                row.color === "teal" ? "text-teal-400" :
                row.color === "amber" ? "text-amber-400" :
                "text-red-400"
              }`}>
                {row.icon} {row.route}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2 px-1">
          Blending formula: final_confidence = (human × 0.6) + (AI × 0.4) when human review applies.
        </p>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Judge Q&A</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 ml-3 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
