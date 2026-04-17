"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronRight, Github, Play, RotateCcw, Zap } from "lucide-react";

// ─── Solana / Colosseum design tokens ────────────────────────────────────────
// Colors exactly from Solana Frontier: #9945FF (purple), #14F195 (green),
// #0A0A0A (near-black bg), white text, uppercase editorial labels

type ScenarioId = "success" | "dispute" | "fraud";

const SCENARIOS: Record<ScenarioId, { label: string; tag: string; color: string; desc: string }> = {
  success: { label: "01 — Successful payment", tag: "HAPPY PATH",  color: "green",  desc: "Client goes silent → auto-release after 48h" },
  dispute: { label: "02 — Dispute raised",     tag: "EDGE CASE",   color: "purple", desc: "Client disputes → DAO arbitration → freelancer wins" },
  fraud:   { label: "03 — Fraud attempt",      tag: "ATTACK",      color: "red",    desc: "Fake proof submitted → AI flags → funds frozen" },
};

interface Step {
  id: string; label: string; sub: string;
  color: "green" | "purple" | "red" | "white";
  detail: string; trustDelta: number; tx?: string;
}

const SUCCESS_STEPS: Step[] = [
  { id:"c", label:"Job created",           sub:"Scope locked on IPFS",            color:"white",  detail:"Job ID: 550e8400\nClient: 4xYz...9Abc\nFreelancer: 7rWq...2Def\nDeadline: 2026-05-01",                              trustDelta:10, tx:"5KtP9x" },
  { id:"l", label:"500 USDC locked",       sub:"Funds in escrow smart contract",  color:"purple", detail:"Amount: 500 USDC\nState: Locked\nAuto-release: 48h after delivery\nVault PDA: verified on-chain",                  trustDelta:20, tx:"6LuQ0y" },
  { id:"p", label:"Proof submitted",       sub:"GitHub + Vercel URL on IPFS",     color:"white",  detail:"github.com/priya/aqoryn-landing ✓\naqoryn-landing.vercel.app ✓\nSubmitted: 2026-04-15 10:30 UTC",                  trustDelta:15, tx:"7MvR1z" },
  { id:"a", label:"AI verified — 94%",     sub:"3/3 deliverables confirmed",      color:"green",  detail:"✓ GitHub repo exists (1.2MB, last push 2h ago)\n✓ Vercel URL → HTTP 200\n✓ All 3 deliverable IDs covered\nReport hash: a3f4b2c1... stored on-chain", trustDelta:25 },
  { id:"r", label:"497.50 USDC released",  sub:"Auto-release after 48h silence",  color:"green",  detail:"Trigger: AutoRelease (48h elapsed)\nPayout: 497.50 USDC → Priya\nFee: 2.50 USDC (0.5%)\nUpwork would've charged: $100",  trustDelta:20, tx:"8NwS2a" },
  { id:"n", label:"NFT minted",            sub:"Portable proof-of-work in wallet",color:"purple", detail:"AQPOW-#0007 · web-development\n500 USDC · Delivered in 28h\nSoul-bound: non-transferable\nQueryable by any future client",   trustDelta:10, tx:"9OxT3b" },
];

const DISPUTE_STEPS: Step[] = [
  { id:"c", label:"Job created",         sub:"Scope locked on IPFS",             color:"white",  detail:"Job ID: 661f9511 · Amount: 800 USDC",                                                     trustDelta:10, tx:"Ax1B2C" },
  { id:"l", label:"800 USDC locked",     sub:"Funds in escrow smart contract",   color:"purple", detail:"State: Locked\nAuto-release: 48h after delivery",                                         trustDelta:20 },
  { id:"p", label:"Proof submitted",     sub:"Deliverables uploaded",            color:"white",  detail:"Figma design link submitted\nPrototype URL provided",                                     trustDelta:15 },
  { id:"a", label:"AI verified — 78%",   sub:"2/3 deliverables confirmed",       color:"white",  detail:"✓ Figma link exists\n✓ Prototype URL reachable\n⚠ Mobile version not confirmed\nRouted to human review tier", trustDelta:10 },
  { id:"d", label:"Client disputes",     sub:"Within 48h window",                color:"red",    detail:"Reason: Mobile version missing\nFunds frozen pending arbitration\n3 jurors assigned (staked AQRN)", trustDelta:-5 },
  { id:"v", label:"DAO votes — 2:1",     sub:"Freelancer wins arbitration",      color:"white",  detail:"Votes: 2 freelancer / 1 client\nMinority juror slashed 20% stake\n72h resolution time",  trustDelta:15 },
  { id:"r", label:"794 USDC released",   sub:"Arbitration payout",               color:"green",  detail:"Payout: 794 USDC → Priya\nFee: 4 USDC (0.5%)\nMinority juror lost: 20 AQRN",            trustDelta:15 },
];

const FRAUD_STEPS: Step[] = [
  { id:"c", label:"Job created",         sub:"Scope locked on IPFS",             color:"white", detail:"Job ID: 772g0622 · Amount: 1200 USDC",                                                     trustDelta:10 },
  { id:"l", label:"1200 USDC locked",    sub:"Funds in escrow",                  color:"purple",detail:"State: Locked",                                                                            trustDelta:15 },
  { id:"p", label:"Suspicious proof",    sub:"Empty GitHub repo submitted",      color:"red",   detail:"github.com/bad-actor/fake-repo\nRepo size: 0KB · Last push: never",                       trustDelta:-10 },
  { id:"a", label:"AI flags — 12%",      sub:"Deterministic checks FAILED",      color:"red",   detail:"✗ GitHub repo empty (0KB)\n✗ No commits found\n✗ Live URL unreachable\nConfidence: 12% — BLOCKED", trustDelta:-20 },
  { id:"f", label:"Funds frozen",        sub:"Auto-release BLOCKED by AI gate",  color:"red",   detail:"AI confidence 12% < 75% threshold\nAuto-release DENIED\nDispute triggered automatically",trustDelta:0 },
  { id:"r", label:"Client refunded",     sub:"1200 USDC returned",               color:"green", detail:"Fraudulent delivery rejected\nFull refund: 1200 USDC → Mark\nBad actor flagged on-chain", trustDelta:20 },
];

const STEPS: Record<ScenarioId, Step[]> = { success: SUCCESS_STEPS, dispute: DISPUTE_STEPS, fraud: FRAUD_STEPS };

// ─── Color helpers (Solana palette) ──────────────────────────────────────────
const COLOR = {
  green:  { hex: "#14F195", bg: "rgba(20,241,149,.08)",  border: "rgba(20,241,149,.25)"  },
  purple: { hex: "#9945FF", bg: "rgba(153,69,255,.08)",  border: "rgba(153,69,255,.25)"  },
  red:    { hex: "#FF4444", bg: "rgba(255,68,68,.08)",   border: "rgba(255,68,68,.25)"   },
  white:  { hex: "#ffffff", bg: "rgba(255,255,255,.05)", border: "rgba(255,255,255,.12)" },
};

export default function DemoPage() {
  const [scenario, setScenario]     = useState<ScenarioId>("success");
  const [completed, setCompleted]   = useState<string[]>([]);
  const [active, setActive]         = useState<string | null>(null);
  const [done, setDone]             = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [trust, setTrust]           = useState(30);
  const [countdown, setCountdown]   = useState({ d: 24, h: 1, m: 1, s: 25 });

  // Live countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        let { d, h, m, s } = c;
        s--; if(s < 0) { s = 59; m--; }
        if(m < 0) { m = 59; h--; }
        if(h < 0) { h = 23; d--; }
        if(d < 0) d = 0;
        return { d, h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const steps   = STEPS[scenario];
  const nextIdx = steps.findIndex(s => !completed.includes(s.id));
  const nextStep = nextIdx >= 0 ? steps[nextIdx] : null;
  const trustColor = trust >= 75 ? "#14F195" : trust >= 50 ? "#FFB800" : "#FF4444";
  const riskLabel  = trust >= 75 ? "LOW" : trust >= 50 ? "MEDIUM" : "HIGH";

  async function runStep(step: Step) {
    if(completed.includes(step.id)) return;
    setActive(step.id);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    setActive(null);
    setCompleted(p => [...p, step.id]);
    setExpanded(step.id);
    setTrust(t => Math.min(100, Math.max(0, t + step.trustDelta)));
    if(steps[steps.length - 1].id === step.id) setDone(true);
  }

  async function runAll() {
    setAutoRunning(true);
    for(let i = nextIdx; i < steps.length; i++) {
      await runStep(steps[i]);
      await new Promise(r => setTimeout(r, 200));
    }
    setAutoRunning(false);
  }

  function reset() {
    setCompleted([]); setActive(null); setDone(false);
    setExpanded(null); setAutoRunning(false); setTrust(30);
  }

  function changeScenario(s: ScenarioId) { setScenario(s); reset(); }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#fff", fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>

      {/* ── TOP BANNER (Colosseum-style) ─────────────────────────────────── */}
      <div style={{ background: "rgba(153,69,255,.15)", borderBottom: "1px solid rgba(153,69,255,.3)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🏔️</span>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".08em", color: "#9945FF" }}>FRONTIER LIVE</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,.5)" }}>—</span>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,.7)" }}>Submissions due in</span>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { val: pad(countdown.d), lbl: "DAYS" },
            { val: pad(countdown.h), lbl: "HRS" },
            { val: pad(countdown.m), lbl: "MIN" },
            { val: pad(countdown.s), lbl: "SEC" },
          ].map((item, i) => (
            <div key={item.lbl} style={{ display: "flex", alignItems: "center", gap: i < 3 ? "6px" : "0" }}>
              <div style={{ background: "rgba(153,69,255,.2)", border: "1px solid rgba(153,69,255,.4)", borderRadius: "6px", padding: "4px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "monospace", color: "#9945FF" }}>{item.val}</div>
                <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "rgba(255,255,255,.4)", marginTop: "1px" }}>{item.lbl}</div>
              </div>
              {i < 3 && <span style={{ color: "rgba(153,69,255,.5)", fontWeight: 700 }}>:</span>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,.5)" }}>13,688+ builders in the arena</div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", padding: "72px 0 56px", position: "relative" }}>
          {/* Mountain decoration */}
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: "120px", background: "linear-gradient(180deg, transparent, rgba(153,69,255,.04))", pointerEvents: "none", borderRadius: "50% 50% 0 0" }} />

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "99px", border: "1px solid rgba(20,241,149,.3)", background: "rgba(20,241,149,.06)", marginBottom: "24px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#14F195", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".1em", color: "#14F195" }}>INTERACTIVE DEMO — NO WALLET REQUIRED</span>
            </div>

            <h1 style={{ fontSize: "clamp(56px, 10vw, 96px)", fontWeight: 900, lineHeight: 1, margin: "0 0 12px", letterSpacing: "-.02em" }}>
              <span style={{ background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Aqoryn
              </span>
            </h1>
            <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 600, color: "rgba(255,255,255,.85)", margin: "0 0 10px" }}>
              Trust Infrastructure for Freelance Payments
            </p>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,.45)", maxWidth: "480px", margin: "0 auto 36px", lineHeight: 1.7 }}>
              Eliminate payment fraud with real-time escrow, AI verification,
              and smart auto-release. Built on Solana. 0.5% fee.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={runAll}
                disabled={autoRunning || done}
                style={{ padding: "14px 32px", background: "linear-gradient(135deg, #9945FF, #14F195)", border: "none", borderRadius: "10px", color: "#000", fontWeight: 800, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", letterSpacing: ".02em", opacity: (autoRunning || done) ? .5 : 1 }}
              >
                <Play style={{ width: "16px", height: "16px" }} />
                RUN LIVE DEMO
              </button>
              <a
                href="https://github.com/guna-thota/aqoryn"
                target="_blank"
                rel="noreferrer"
                style={{ padding: "14px 28px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)", borderRadius: "10px", color: "rgba(255,255,255,.7)", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", letterSpacing: ".02em" }}
              >
                <Github style={{ width: "16px", height: "16px" }} />
                VIEW ON GITHUB
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── PROBLEM STATS (Colosseum numbered cards) ─────────────────────── */}
        <section style={{ paddingBottom: "64px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "10px" }}>THE PROBLEM</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Freelancers don't get paid.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" }}>
            {[
              { num: "71%",    label: "of freelancers ghosted on payment at least once",       accent: "#FF4444" },
              { num: "44d",    label: "average payment delay for independent contractors",      accent: "#FFB800" },
              { num: "$250B",  label: "lost annually to freelance payment failures globally",   accent: "#FF4444" },
            ].map((s, i) => (
              <div key={s.num} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "16px", padding: "28px 20px", textAlign: "center", borderTop: `3px solid ${s.accent}` }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", color: "rgba(255,255,255,.3)", marginBottom: "14px" }}>0{i + 1}</div>
                <div style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, color: s.accent, letterSpacing: "-.02em", marginBottom: "10px" }}>{s.num}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(153,69,255,.06)", border: "1px solid rgba(153,69,255,.2)", borderRadius: "14px", padding: "18px 24px", textAlign: "center" }}>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>
              Platforms charge <strong style={{ color: "#fff" }}>20%</strong> to own trust. When trust fails, you lose everything.{" "}
              <span style={{ color: "#14F195", fontWeight: 600 }}>Aqoryn removes trust from the equation entirely.</span>
            </span>
          </div>
        </section>

        {/* ── SCENARIO SELECTOR ────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "48px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "10px" }}>LIVE SIMULATION</div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Select a scenario</h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,.4)", marginTop: "8px" }}>Not just the happy path — every outcome handled.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" }}>
            {(Object.entries(SCENARIOS) as [ScenarioId, typeof SCENARIOS[ScenarioId]][]).map(([id, s]) => {
              const active = scenario === id;
              const col = COLOR[s.color as keyof typeof COLOR] || COLOR.white;
              return (
                <button
                  key={id}
                  onClick={() => changeScenario(id)}
                  style={{
                    padding: "20px 16px",
                    borderRadius: "14px",
                    border: `1px solid ${active ? col.border : "rgba(255,255,255,.07)"}`,
                    background: active ? col.bg : "rgba(255,255,255,.02)",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all .2s",
                    boxShadow: active ? `0 0 24px ${col.hex}22` : "none",
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", color: active ? col.hex : "rgba(255,255,255,.3)", marginBottom: "10px" }}>{s.tag}</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,.6)", marginBottom: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,.35)", lineHeight: 1.5 }}>{s.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Demo grid */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "20px" }}>

            {/* LEFT: metrics + controls */}
            <div>
              {/* Personas */}
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", color: "rgba(255,255,255,.3)", marginBottom: "14px" }}>PARTIES</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🇺🇸</div>
                  <div><div style={{ fontSize: "13px", fontWeight: 700 }}>Mark</div><div style={{ fontSize: "11px", color: "rgba(255,255,255,.35)" }}>US Client</div></div>
                </div>
                <div style={{ height: "1px", background: "rgba(255,255,255,.06)", margin: "0 0 12px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🇮🇳</div>
                  <div><div style={{ fontSize: "13px", fontWeight: 700 }}>Priya</div><div style={{ fontSize: "11px", color: "rgba(255,255,255,.35)" }}>IN Freelancer</div></div>
                </div>
              </div>

              {/* Trust score */}
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", color: "rgba(255,255,255,.3)", marginBottom: "12px" }}>TRUST SCORE</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,.4)" }}>Score</span>
                  <span style={{ fontSize: "28px", fontWeight: 900, color: trustColor, fontFamily: "monospace" }}>{trust}%</span>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,.08)", borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
                  <motion.div style={{ height: "100%", borderRadius: "2px", background: `linear-gradient(90deg, ${trustColor}88, ${trustColor})` }} animate={{ width: `${trust}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ background: "rgba(0,0,0,.3)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: trustColor }}>{riskLabel}</div>
                    <div style={{ fontSize: "9px", letterSpacing: ".08em", color: "rgba(255,255,255,.3)", marginTop: "2px" }}>RISK</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,.3)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#9945FF" }}>{completed.length}/{steps.length}</div>
                    <div style={{ fontSize: "9px", letterSpacing: ".08em", color: "rgba(255,255,255,.3)", marginTop: "2px" }}>STEPS</div>
                  </div>
                </div>
                {active && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", fontSize: "11px", color: "#FFB800", background: "rgba(255,184,0,.08)", border: "1px solid rgba(255,184,0,.2)", borderRadius: "8px", padding: "8px 10px" }}>
                    <div style={{ width: "10px", height: "10px", border: "1.5px solid rgba(255,184,0,.3)", borderTopColor: "#FFB800", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
                    Processing on Solana…
                  </div>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {!done && (
                  <>
                    <button
                      onClick={() => nextStep && runStep(nextStep)}
                      disabled={!nextStep || autoRunning || !!active}
                      style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg, #9945FF, #14F195)", border: "none", borderRadius: "10px", color: "#000", fontWeight: 800, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: ".06em", opacity: (!nextStep || autoRunning || !!active) ? .4 : 1 }}
                    >
                      {active ? <><div style={{ width: "10px", height: "10px", border: "2px solid rgba(0,0,0,.3)", borderTopColor: "#000", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> PROCESSING</> : <><ChevronRight style={{ width: "14px", height: "14px" }} />NEXT STEP</>}
                    </button>
                    <button
                      onClick={runAll}
                      disabled={autoRunning || !!active}
                      style={{ width: "100%", padding: "9px", background: "rgba(153,69,255,.1)", border: "1px solid rgba(153,69,255,.3)", borderRadius: "10px", color: "#9945FF", fontWeight: 700, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: ".06em", opacity: (autoRunning || !!active) ? .4 : 1 }}
                    >
                      <Zap style={{ width: "12px", height: "12px" }} /> RUN ALL
                    </button>
                  </>
                )}
                <button
                  onClick={reset}
                  style={{ width: "100%", padding: "9px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "10px", color: "rgba(255,255,255,.4)", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: ".06em" }}
                >
                  <RotateCcw style={{ width: "12px", height: "12px" }} /> RESET
                </button>
              </div>
            </div>

            {/* RIGHT: Timeline */}
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", color: "rgba(255,255,255,.3)", marginBottom: "14px" }}>TRANSACTION TIMELINE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {steps.map((step, i) => {
                  const isDone     = completed.includes(step.id);
                  const isActive   = active === step.id;
                  const isNext     = i === nextIdx;
                  const isExpanded = expanded === step.id;
                  const col        = isDone ? COLOR[step.color] : COLOR.white;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        border: `1px solid ${isDone ? col.border : "rgba(255,255,255,.06)"}`,
                        background: isDone ? col.bg : "rgba(255,255,255,.02)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: isActive ? `0 0 16px ${COLOR[step.color]?.hex || "#fff"}22` : "none",
                        transition: "all .3s",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", cursor: isDone ? "pointer" : "default" }}
                        onClick={() => isDone && setExpanded(isExpanded ? null : step.id)}
                      >
                        {/* Step indicator */}
                        <div style={{
                          width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: `1px solid ${isDone ? col.hex : "rgba(255,255,255,.1)"}`,
                          background: isDone ? `${col.hex}22` : "rgba(255,255,255,.04)",
                          fontSize: "11px", fontWeight: 700, fontFamily: "monospace",
                        }}>
                          {isActive
                            ? <div style={{ width: "10px", height: "10px", border: "1.5px solid rgba(255,184,0,.4)", borderTopColor: "#FFB800", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                            : isDone
                            ? <span style={{ color: col.hex, fontSize: "13px" }}>✓</span>
                            : <span style={{ color: "rgba(255,255,255,.25)" }}>{i + 1}</span>
                          }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: isDone ? "#fff" : "rgba(255,255,255,.35)", transition: "color .3s" }}>
                            {step.label}
                            {isActive && <span style={{ marginLeft: "8px", fontSize: "11px", color: "#FFB800", fontWeight: 400 }}>processing…</span>}
                          </div>
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,.3)", marginTop: "2px" }}>{step.sub}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {step.tx && isDone && (
                            <a
                              href={`https://explorer.solana.com/tx/${step.tx}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: "10px", color: "rgba(255,255,255,.3)", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none", letterSpacing: ".06em", fontWeight: 600 }}
                            >
                              <ExternalLink style={{ width: "10px", height: "10px" }} />TX
                            </a>
                          )}
                          {isDone && <ChevronRight style={{ width: "13px", height: "13px", color: "rgba(255,255,255,.3)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && step.detail && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                            <pre style={{
                              margin: "0 14px 12px",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              background: "rgba(0,0,0,.4)",
                              border: `1px solid ${col.border}`,
                              fontSize: "11px",
                              fontFamily: "monospace",
                              color: col.hex,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.7,
                            }}>
                              {step.detail}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Result */}
              <AnimatePresence>
                {done && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "12px" }}>
                    {scenario === "success" && (
                      <div style={{ background: "rgba(20,241,149,.06)", border: "1px solid rgba(20,241,149,.3)", borderRadius: "18px", padding: "28px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎉</div>
                        <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#14F195", margin: "0 0 16px", letterSpacing: "-.01em" }}>Priya got paid. Without chasing anyone.</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                          {[
                            { val: "$497.50", lbl: "Priya received", col: "#14F195" },
                            { val: "$2.50",   lbl: "Protocol fee (0.5%)", col: "#14F195" },
                            { val: "$100",    lbl: "Upwork would've charged", col: "#FF4444", strike: true },
                          ].map(m => (
                            <div key={m.lbl} style={{ background: "rgba(0,0,0,.3)", borderRadius: "10px", padding: "12px 8px" }}>
                              <div style={{ fontSize: "18px", fontWeight: 900, color: m.col, textDecoration: m.strike ? "line-through" : "none", letterSpacing: "-.01em" }}>{m.val}</div>
                              <div style={{ fontSize: "10px", color: "rgba(255,255,255,.4)", marginTop: "4px", lineHeight: 1.3 }}>{m.lbl}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: "13px", color: "rgba(20,241,149,.6)", fontStyle: "italic" }}>"Mark never responded. That didn't matter. The code handled it."</div>
                      </div>
                    )}
                    {scenario === "dispute" && (
                      <div style={{ background: "rgba(153,69,255,.06)", border: "1px solid rgba(153,69,255,.3)", borderRadius: "18px", padding: "24px", textAlign: "center" }}>
                        <div style={{ fontSize: "36px", marginBottom: "10px" }}>⚖️</div>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#9945FF", margin: "0 0 10px" }}>Dispute resolved. Freelancer wins.</h3>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,.5)", lineHeight: 1.6, margin: 0 }}>DAO jurors reviewed evidence. 2 voted for Priya, 1 for Mark. The minority juror lost 20% of staked AQRN. Economic accountability at every layer.</p>
                      </div>
                    )}
                    {scenario === "fraud" && (
                      <div style={{ background: "rgba(255,68,68,.05)", border: "1px solid rgba(255,68,68,.3)", borderRadius: "18px", padding: "24px", textAlign: "center" }}>
                        <div style={{ fontSize: "36px", marginBottom: "10px" }}>🛡️</div>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#FF4444", margin: "0 0 10px" }}>Fraud detected. Client protected.</h3>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,.5)", lineHeight: 1.6, margin: 0 }}>AI confidence was 12% — below the 75% threshold. Auto-release blocked automatically. 1200 USDC returned to Mark. No human intervention needed.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (Colosseum 01/02/03 style) ──────────────────────── */}
        <section style={{ paddingBottom: "64px", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: "56px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "10px" }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Three-tier verification</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { num:"01", title:"Deterministic",    color:"#14F195", desc:"GitHub API confirms repo exists and has commits. URL HEAD requests check HTTP 200. Deliverable IDs cross-referenced. Ungameable." },
              { num:"02", title:"AI semantic",       color:"#9945FF", desc:"Claude verifies completeness — does proof match the scope? Confidence score 0–100%. Below 75% → blocked. Report hash stored on-chain." },
              { num:"03", title:"Human review",      color:"#FFB800", desc:"AQRN-staked reviewers judge quality. AI generates their briefing. Minority voters slashed 20%. Blended score: human 60% + AI 40%." },
            ].map(s => (
              <div key={s.num} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "16px", padding: "28px 20px", borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: "32px", fontWeight: 900, color: `${s.color}33`, fontFamily: "monospace", marginBottom: "14px", letterSpacing: "-.02em" }}>{s.num}</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: s.color, marginBottom: "10px", letterSpacing: "-.01em" }}>{s.title}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "16px", textAlign: "center", padding: "14px", background: "rgba(255,184,0,.05)", border: "1px solid rgba(255,184,0,.15)", borderRadius: "10px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,184,0,.7)", fontStyle: "italic" }}>
              "AI cannot release funds. It only generates verifiable evidence."
            </span>
          </div>
        </section>

        {/* ── SMART CONTRACTS ──────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "64px", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: "56px" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "10px" }}>ARCHITECTURE</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Three Solana programs</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { name:"aqoryn-escrow",      color:"#9945FF", desc:"State machine: lock → deliver → release/dispute. Auto-release requires proof + AI ≥ 75%. Milestone-based payments up to 10." },
              { name:"aqoryn-reputation",  color:"#14F195", desc:"Soul-bound proof-of-work NFT. Minted via Metaplex. max_supply=0 enforces non-transferability. Portable reputation forever." },
              { name:"aqoryn-arbitration", color:"#FFB800", desc:"DAO voting with staked AQRN. Jurors stake to vote. Minority slashed 20%. 72-hour resolution window. Fully on-chain." },
            ].map(p => (
              <div key={p.name} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${p.color}33`, borderRadius: "16px", padding: "22px 18px" }}>
                <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, color: p.color, marginBottom: "10px", letterSpacing: ".04em" }}>{p.name}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMPARISON ───────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "64px", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: "56px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "10px" }}>COMPARISON</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Why not just use Upwork?</h2>
          </div>
          <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,.03)" }}>
                  <th style={{ padding: "14px 18px", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.35)" }}>FEATURE</th>
                  <th style={{ padding: "14px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.35)" }}>UPWORK</th>
                  <th style={{ padding: "14px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.35)" }}>FIVERR</th>
                  <th style={{ padding: "14px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: ".08em", color: "#14F195", background: "rgba(20,241,149,.05)", borderLeft: "1px solid rgba(20,241,149,.2)", borderRight: "1px solid rgba(20,241,149,.2)" }}>AQORYN</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Platform fee",            "20%",   "20%",  "0.5%"   ],
                  ["Escrow",                  "✓",     "✓",    "✓"      ],
                  ["Auto-release on silence", "✗",     "✗",    "✓ 48h"  ],
                  ["AI proof verification",   "✗",     "✗",    "✓"      ],
                  ["Human review layer",      "✗",     "✗",    "✓"      ],
                  ["Milestone payments",      "✓",     "✗",    "✓"      ],
                  ["Portable reputation NFT", "✗",     "✗",    "✓"      ],
                  ["No platform lock-in",     "✗",     "✗",    "✓"      ],
                  ["Cross-border USDC",       "Fees",  "Fees", "~$0"    ],
                ].map(([f, up, fv, aq], i) => (
                  <tr key={String(f)} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                    <td style={{ padding: "11px 18px", color: "rgba(255,255,255,.6)", fontSize: "12px" }}>{f}</td>
                    <td style={{ padding: "11px 14px", textAlign: "center", color: up === "✗" ? "rgba(255,68,68,.5)" : "rgba(255,255,255,.3)", fontSize: "13px" }}>{up}</td>
                    <td style={{ padding: "11px 14px", textAlign: "center", color: fv === "✗" ? "rgba(255,68,68,.5)" : "rgba(255,255,255,.3)", fontSize: "13px" }}>{fv}</td>
                    <td style={{ padding: "11px 14px", textAlign: "center", color: "#14F195", fontWeight: 700, fontSize: "13px", background: "rgba(20,241,149,.03)", borderLeft: "1px solid rgba(20,241,149,.1)", borderRight: "1px solid rgba(20,241,149,.1)" }}>{aq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── USE CASES ────────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "64px", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: "56px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "10px" }}>USE CASES</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Who is this for</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { icon: "👩‍💻", label: "Freelancers",    sub: "Fiverr, Upwork, direct clients" },
              { icon: "🏢",  label: "Agencies",        sub: "Contract dev shops & studios"  },
              { icon: "🌍",  label: "Cross-border",    sub: "India → US, PH → EU"           },
              { icon: "🤝",  label: "Remote hiring",   sub: "Contract developers & writers" },
            ].map(u => (
              <div key={u.label} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", padding: "20px 14px", textAlign: "center", transition: "border-color .2s" }}>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>{u.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "5px" }}>{u.label}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,.35)", lineHeight: 1.4 }}>{u.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "80px" }}>
          <div style={{ textAlign: "center", border: "1px solid rgba(153,69,255,.2)", borderRadius: "24px", padding: "64px 32px", background: "linear-gradient(180deg, rgba(153,69,255,.06) 0%, transparent 100%)", position: "relative", overflow: "hidden" }}>
            {/* Mountain silhouette decoration */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: "linear-gradient(180deg, transparent, rgba(153,69,255,.04))", clipPath: "polygon(0 100%, 20% 40%, 35% 65%, 50% 20%, 65% 55%, 80% 35%, 100% 60%, 100% 100%)", pointerEvents: "none" }} />
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", color: "#9945FF", marginBottom: "16px" }}>🏔️ FRONTIER HACKATHON ENTRY</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, margin: "0 0 12px", letterSpacing: "-.02em" }}>Ready to build trust in digital work?</h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,.45)", marginBottom: "32px", lineHeight: 1.6 }}>
              Solana Frontier Hackathon · $2.5M from Colosseum&apos;s venture fund · Open source · No signup required
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={reset}
                style={{ padding: "14px 32px", background: "linear-gradient(135deg, #9945FF, #14F195)", border: "none", borderRadius: "10px", color: "#000", fontWeight: 800, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", letterSpacing: ".04em" }}
              >
                <Play style={{ width: "16px", height: "16px" }} /> TRY THE DEMO
              </button>
              <a
                href="https://github.com/guna-thota/aqoryn"
                target="_blank"
                rel="noreferrer"
                style={{ padding: "14px 28px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)", borderRadius: "10px", color: "rgba(255,255,255,.7)", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", letterSpacing: ".04em" }}
              >
                <Github style={{ width: "16px", height: "16px" }} /> VIEW GITHUB
              </a>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,.2)", marginTop: "24px", fontStyle: "italic" }}>
              "We don't trust clients. We don't trust freelancers. We trust code."
            </p>
          </div>
        </section>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
