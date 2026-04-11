import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import type { ScopeDocument, ProofPackage } from "../../frontend/src/lib/ipfs";
import type { VerificationResult } from "./verifier";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Verification routing thresholds ─────────────────────────────────────────
export const THRESHOLDS = {
  AUTO_RELEASE:     0.85,  // ≥85% → auto-release (AI alone sufficient)
  HUMAN_REQUIRED:   0.75,  // 75–85% → human review recommended
  DISPUTE_REQUIRED: 0.60,  // <60% → force dispute / block release
  HIGH_VALUE_USDC:  1000,  // Jobs above $1000 always get human review option
};

export type VerificationRoute =
  | "auto_release"     // AI confidence high, deterministic checks pass → release
  | "human_review"     // AI uncertain OR high-value job → human reviewer required
  | "dispute"          // AI confidence low → funds frozen, arbitration triggered
  | "escalate";        // Human reviewer flagged issue → escalate to DAO

export interface RoutingDecision {
  route:           VerificationRoute;
  reason:          string;
  aiConfidence:    number;
  humanRequired:   boolean;
  reviewerBounty:  number;   // USDC bounty for human reviewer
  escalationRisk:  "low" | "medium" | "high";
}

export interface HumanReviewRequest {
  jobId:        string;
  scopeCid:     string;
  proofCid:     string;
  aiReport:     VerificationResult;
  jobAmountUsd: number;
  deadline:     string;
  bountyUsdc:   number;
  assignedTo?:  string;   // reviewer wallet
  createdAt:    string;
}

export interface HumanVerdict {
  reviewRequestId: string;
  jobId:           string;
  reviewer:        string;   // wallet address
  verdict:         "approve" | "reject" | "partial" | "escalate";
  confidence:      number;   // reviewer's self-reported confidence
  notes:           string;
  deliverableVerdicts: DeliverableVerdict[];
  stakeRisked:     number;   // AQRN staked by reviewer
  submittedAt:     string;
  reportHash:      string;
}

export interface DeliverableVerdict {
  deliverableId: string;
  title:         string;
  approved:      boolean;
  qualityScore:  number;   // 1-5 (human judgment, AI can't do this)
  notes:         string;
}

// ─── Route a job to the right verification tier ────────────────────────────────
export function routeVerification(
  aiResult:     VerificationResult,
  jobAmountUsd: number
): RoutingDecision {
  const conf = aiResult.confidence;
  const isHighValue = jobAmountUsd >= THRESHOLDS.HIGH_VALUE_USDC;

  // Always human-review high-value jobs regardless of AI confidence
  if (isHighValue && conf < THRESHOLDS.AUTO_RELEASE) {
    return {
      route:          "human_review",
      reason:         `Job value $${jobAmountUsd} ≥ $${THRESHOLDS.HIGH_VALUE_USDC} — human review required regardless of AI confidence`,
      aiConfidence:   conf,
      humanRequired:  true,
      reviewerBounty: Math.round(jobAmountUsd * 0.005), // 0.5% of job as bounty
      escalationRisk: "medium",
    };
  }

  if (conf >= THRESHOLDS.AUTO_RELEASE) {
    return {
      route:          "auto_release",
      reason:         `AI confidence ${(conf * 100).toFixed(0)}% ≥ ${THRESHOLDS.AUTO_RELEASE * 100}% threshold, all deterministic checks passed`,
      aiConfidence:   conf,
      humanRequired:  false,
      reviewerBounty: 0,
      escalationRisk: "low",
    };
  }

  if (conf >= THRESHOLDS.HUMAN_REQUIRED) {
    return {
      route:          "human_review",
      reason:         `AI confidence ${(conf * 100).toFixed(0)}% in uncertain range (${THRESHOLDS.HUMAN_REQUIRED * 100}–${THRESHOLDS.AUTO_RELEASE * 100}%) — human reviewer assigned`,
      aiConfidence:   conf,
      humanRequired:  true,
      reviewerBounty: Math.max(5, Math.round(jobAmountUsd * 0.01)), // 1% of job, min $5
      escalationRisk: "medium",
    };
  }

  return {
    route:          "dispute",
    reason:         `AI confidence ${(conf * 100).toFixed(0)}% below ${THRESHOLDS.DISPUTE_REQUIRED * 100}% minimum — funds frozen, dispute triggered`,
    aiConfidence:   conf,
    humanRequired:  true,
    reviewerBounty: 0,
    escalationRisk: "high",
  };
}

// ─── Generate human review request ────────────────────────────────────────────
export function createReviewRequest(
  scope:    ScopeDocument,
  proof:    ProofPackage,
  aiResult: VerificationResult,
  routing:  RoutingDecision
): HumanReviewRequest {
  return {
    jobId:        scope.jobId,
    scopeCid:     proof.jobId,
    proofCid:     aiResult.reportHash.slice(0, 16), // placeholder
    aiReport:     aiResult,
    jobAmountUsd: scope.amount,
    deadline:     scope.deadline,
    bountyUsdc:   routing.reviewerBounty,
    createdAt:    new Date().toISOString(),
  };
}

// ─── AI-assisted reviewer briefing ───────────────────────────────────────────
// When a human reviewer opens the job, they get an AI-generated briefing
// that highlights what the AI was uncertain about. Saves reviewer time.
export async function generateReviewerBriefing(
  scope:    ScopeDocument,
  proof:    ProofPackage,
  aiResult: VerificationResult
): Promise<string> {

  const uncertainItems = aiResult.deterministicChecks
    .filter(c => !c.passed)
    .map(c => `- ${c.label}: ${c.detail}`)
    .join("\n");

  const missingItems = aiResult.missingItems
    .map(m => `- ${m}`)
    .join("\n");

  const response = await client.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 800,
    system:     `You are helping a human reviewer verify freelance work on the Aqoryn protocol.
Your job is to create a concise, scannable briefing that tells the reviewer exactly what to look at.
The reviewer has limited time. Lead with the most important thing first.
Format with clear sections. Be specific about what to check.`,
    messages: [{
      role: "user",
      content: `
REVIEWER BRIEFING REQUEST
=========================

Job: ${scope.title}
Amount: $${scope.amount} USDC
AI Confidence: ${(aiResult.confidence * 100).toFixed(0)}% (below auto-release threshold)

AI UNCERTAINTY AREAS:
${uncertainItems || "None flagged by deterministic checks"}

MISSING/UNVERIFIED ITEMS:
${missingItems || "None — AI verified all deliverables"}

AI SUMMARY: ${aiResult.summary}

SCOPE DELIVERABLES:
${scope.deliverables.map((d, i) => `${i+1}. ${d.title}: ${d.description} (format: ${d.format ?? "any"})`).join("\n")}

SUBMITTED PROOF:
${proof.deliverables.map((p, i) => `${i+1}. ${p.title} (${p.type}): ${p.content}`).join("\n")}

Generate a reviewer briefing that:
1. States in one sentence what the key issue is
2. Lists the 2-3 specific things the reviewer MUST check
3. Recommends a verdict if the evidence points clearly one way
4. Notes any scope ambiguities that might affect the verdict

Keep it under 200 words. Reviewers are busy.`
    }],
  });

  return response.content.filter(b => b.type === "text").map(b => b.text).join("");
}

// ─── Validate human verdict ────────────────────────────────────────────────────
export function validateVerdict(
  verdict:  HumanVerdict,
  aiResult: VerificationResult
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Flag if human verdict wildly contradicts AI with high confidence
  if (aiResult.confidence > 0.90 && verdict.verdict === "reject") {
    warnings.push(
      `Human rejected job with ${(aiResult.confidence * 100).toFixed(0)}% AI confidence. Reviewer may need to provide detailed justification.`
    );
  }

  // Flag low reviewer confidence
  if (verdict.confidence < 0.7) {
    warnings.push("Reviewer reported low confidence — consider assigning a second reviewer.");
  }

  // Flag if reviewer approved but AI found missing items
  if (verdict.verdict === "approve" && aiResult.missingItems.length > 0) {
    warnings.push(
      `Reviewer approved but AI flagged missing items: ${aiResult.missingItems.join(", ")}. Reviewer must explicitly address these.`
    );
  }

  // Escalate if reviewer and AI strongly disagree
  const reviewerApproves = verdict.verdict === "approve" || verdict.verdict === "partial";
  const aiApproves = aiResult.confidence >= THRESHOLDS.HUMAN_REQUIRED;
  const strongDisagreement = (reviewerApproves && !aiApproves) || (!reviewerApproves && aiResult.confidence > 0.85);

  if (strongDisagreement) {
    warnings.push("Strong disagreement between human and AI — consider escalating to DAO arbitration.");
  }

  return {
    valid: warnings.filter(w => w.includes("must")).length === 0,
    warnings,
  };
}

// ─── Blended final score ────────────────────────────────────────────────────────
export function blendHumanAndAI(
  aiResult:      VerificationResult,
  humanVerdict:  HumanVerdict
): { finalConfidence: number; finalRecommendation: "release" | "investigate" | "dispute"; reasoning: string } {

  // Human verdict → numeric score
  const humanScore =
    humanVerdict.verdict === "approve"  ? 1.0 :
    humanVerdict.verdict === "partial"  ? 0.6 :
    humanVerdict.verdict === "reject"   ? 0.1 :
    0.3; // escalate

  // Weight: human 60% + AI 40% (human is the authoritative signal)
  const blended = (humanScore * 0.6) + (aiResult.confidence * 0.4);

  const finalRecommendation: "release" | "investigate" | "dispute" =
    blended >= 0.80 ? "release" :
    blended >= 0.55 ? "investigate" :
    "dispute";

  const reasoning = [
    `AI confidence: ${(aiResult.confidence * 100).toFixed(0)}% (weight: 40%)`,
    `Human verdict: ${humanVerdict.verdict} → ${(humanScore * 100).toFixed(0)}% (weight: 60%)`,
    `Blended score: ${(blended * 100).toFixed(0)}% → ${finalRecommendation}`,
    humanVerdict.notes ? `Reviewer note: "${humanVerdict.notes}"` : "",
  ].filter(Boolean).join(" | ");

  return { finalConfidence: blended, finalRecommendation, reasoning };
}
