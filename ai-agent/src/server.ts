import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { verifyDelivery, generateDisputeEvidence } from "./verifier";
import {
  routeVerification, generateReviewerBriefing,
  validateVerdict, blendHumanAndAI, THRESHOLDS,
  type HumanVerdict,
} from "./human-verification";
import type { ScopeDocument, ProofPackage } from "../../frontend/src/lib/ipfs";

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

const ScopeSchema = z.object({
  version: z.literal("1.0"), jobId: z.string(), title: z.string(),
  description: z.string(),
  deliverables: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), format: z.string().optional() })),
  deadline: z.string(), amount: z.number(), currency: z.literal("USDC"), createdAt: z.string(),
});

const ProofSchema = z.object({
  version: z.literal("1.0"), jobId: z.string(), freelancer: z.string(),
  deliverables: z.array(z.object({
    deliverableId: z.string(), title: z.string(),
    type: z.enum(["file", "link", "text", "commit"]), content: z.string(), fileName: z.string().optional(),
  })),
  notes: z.string(), submittedAt: z.string(),
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "aqoryn-ai-agent", version: "0.3.0" });
});

// ─── POST /verify ─────────────────────────────────────────────────────────────
// Full verification: deterministic + AI + routing decision
app.post("/verify", async (req, res) => {
  try {
    const scope = ScopeSchema.parse(req.body.scope);
    const proof = ProofSchema.parse(req.body.proof);
    if (scope.jobId !== proof.jobId) return res.status(400).json({ error: "Job ID mismatch" });
    const aiResult = await verifyDelivery(scope as ScopeDocument, proof as ProofPackage);
    const routing  = routeVerification(aiResult, scope.amount);
    res.json({ success: true, report: aiResult, routing });
  } catch (e: any) {
    if (e?.name === "ZodError") return res.status(400).json({ error: "Invalid body", details: e.errors });
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /verify-by-cid ──────────────────────────────────────────────────────
app.post("/verify-by-cid", async (req, res) => {
  const { scopeCid, proofCid } = req.body;
  if (!scopeCid || !proofCid) return res.status(400).json({ error: "scopeCid and proofCid required" });
  try {
    const gw = "https://nftstorage.link/ipfs";
    const [sr, pr] = await Promise.all([fetch(`${gw}/${scopeCid}`), fetch(`${gw}/${proofCid}/proof.json`)]);
    if (!sr.ok || !pr.ok) throw new Error("IPFS fetch failed");
    const scope = await sr.json() as ScopeDocument;
    const proof = await pr.json() as ProofPackage;
    const aiResult = await verifyDelivery(scope, proof);
    const routing  = routeVerification(aiResult, scope.amount);
    res.json({ success: true, report: aiResult, routing });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /reviewer-briefing ──────────────────────────────────────────────────
// AI generates a 200-word brief for the human reviewer:
// what to check, what AI was uncertain about, recommended verdict direction
app.post("/reviewer-briefing", async (req, res) => {
  try {
    const scope    = ScopeSchema.parse(req.body.scope);
    const proof    = ProofSchema.parse(req.body.proof);
    const aiReport = req.body.aiReport;
    if (!aiReport) return res.status(400).json({ error: "aiReport required" });
    const briefing = await generateReviewerBriefing(scope as ScopeDocument, proof as ProofPackage, aiReport);
    res.json({ success: true, briefing });
  } catch (e: any) {
    if (e?.name === "ZodError") return res.status(400).json({ error: "Invalid body", details: e.errors });
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /human-verdict ──────────────────────────────────────────────────────
// Human reviewer submits their verdict. Returns:
// - validation (did they miss anything the AI flagged?)
// - blended score (human 60% + AI 40%)
// - final recommendation
app.post("/human-verdict", async (req, res) => {
  const VerdictSchema = z.object({
    reviewRequestId:     z.string(),
    jobId:               z.string(),
    reviewer:            z.string(),
    verdict:             z.enum(["approve", "reject", "partial", "escalate"]),
    confidence:          z.number().min(0).max(1),
    notes:               z.string().min(10),
    deliverableVerdicts: z.array(z.object({
      deliverableId: z.string(), title: z.string(),
      approved: z.boolean(), qualityScore: z.number().min(1).max(5), notes: z.string(),
    })),
    stakeRisked: z.number().min(0),
    aiReport:    z.any(),
    submittedAt: z.string(),
  });

  try {
    const body       = VerdictSchema.parse(req.body);
    const validation = validateVerdict(body as HumanVerdict, body.aiReport);
    const blended    = blendHumanAndAI(body.aiReport, body as HumanVerdict);

    res.json({
      success:         true,
      validation,
      blended,
      finalVerdict:    body.verdict,
      finalConfidence: blended.finalConfidence,
      recommendation:  blended.finalRecommendation,
      reasoning:       blended.reasoning,
    });
  } catch (e: any) {
    if (e?.name === "ZodError") return res.status(400).json({ error: "Invalid body", details: e.errors });
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /verification-tiers ──────────────────────────────────────────────────
// Returns the full system design — useful for judges and documentation
app.get("/verification-tiers", (_req, res) => {
  res.json({
    description: "Aqoryn uses 3-tier hybrid verification. AI cannot release funds — it generates evidence. Humans are authoritative on quality.",
    tiers: [
      {
        tier: 1, name: "Deterministic",
        what: "GitHub API (repo exists, has commits), URL HEAD requests (HTTP 200), deliverable ID coverage, deadline check",
        cost: "~$0", speed: "< 2s", gameable: false,
      },
      {
        tier: 2, name: "AI Semantic (Claude)",
        what: "Scope vs proof completeness check. Per-deliverable verdict. Confidence score 0–1.",
        cost: "~$0.01/verification", speed: "3–8s",
        gameable: "Partially (padded submissions) — mitigated by tier 1",
        cannotGame: "GitHub API, URL reachability, ID coverage",
        note: "AI cannot release funds. It only generates verifiable evidence.",
      },
      {
        tier: 3, name: "Human Review (staked)",
        what: "AQRN-staked reviewer checks quality, not just presence. AI generates briefing to focus reviewer attention.",
        triggered: `confidence ${THRESHOLDS.HUMAN_REQUIRED * 100}–${THRESHOLDS.AUTO_RELEASE * 100}% OR job ≥ $${THRESHOLDS.HIGH_VALUE_USDC}`,
        cost: "0.5–1% bounty paid to reviewer",
        speed: "Up to 24h",
        gameable: false,
        economicSecurity: "Reviewer stakes AQRN. Minority verdict = 20% slash. Honest verdict = bounty + stake back.",
      },
    ],
    routing: {
      "≥85% AI + all checks pass": "auto_release — no human needed",
      "75–85% AI OR job >$1000":    "human_review — reviewer assigned, bounty offered",
      "<60% AI":                    "dispute — DAO arbitration",
    },
    blending: {
      formula: "final_confidence = (human × 0.6) + (AI × 0.4)",
      reason:  "Human is authoritative on quality. AI is authoritative on completeness. Neither alone is sufficient.",
    },
  });
});

// ─── POST /dispute-evidence ───────────────────────────────────────────────────
app.post("/dispute-evidence", async (req, res) => {
  try {
    const scope        = ScopeSchema.parse(req.body.scope);
    const proof        = ProofSchema.parse(req.body.proof);
    const clientReason = z.string().min(10).max(2000).parse(req.body.clientReason);
    const evidence     = await generateDisputeEvidence(scope as ScopeDocument, proof as ProofPackage, clientReason);
    res.json({ success: true, evidence });
  } catch (e: any) {
    if (e?.name === "ZodError") return res.status(400).json({ error: "Invalid body", details: e.errors });
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Aqoryn AI agent v0.3.0 — http://localhost:${PORT}`));
export default app;
