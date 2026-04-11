import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import type { ScopeDocument, ProofPackage, ProofDeliverable } from "../../frontend/src/lib/ipfs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface VerificationResult {
  jobId:              string;
  deliverableCount:   number;
  verifiedCount:      number;
  missingItems:       string[];
  confidence:         number;   // 0–1
  confidenceBps:      number;   // 0–10000 (for on-chain storage)
  summary:            string;
  recommendation:     "release" | "investigate" | "dispute";
  deterministicChecks: DeterministicCheck[];
  reportHash:         string;
  generatedAt:        string;
}

export interface DeterministicCheck {
  label:   string;
  passed:  boolean;
  detail:  string;
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export async function verifyDelivery(
  scope: ScopeDocument,
  proof: ProofPackage
): Promise<VerificationResult> {

  // STEP 1: Deterministic checks (fast, cheap, ungameable)
  const deterministicChecks = await runDeterministicChecks(scope, proof);
  const deterministicScore  = deterministicChecks.filter(c => c.passed).length / Math.max(deterministicChecks.length, 1);

  // STEP 2: AI semantic verification
  const aiResult = await runAIVerification(scope, proof, deterministicChecks);

  // STEP 3: Blend scores (deterministic 40% + AI 60%)
  const blendedConfidence = (deterministicScore * 0.4) + (aiResult.confidence * 0.6);

  // STEP 4: Apply confidence gate
  const finalRecommendation: "release" | "investigate" | "dispute" =
    blendedConfidence >= 0.85 ? "release" :
    blendedConfidence >= 0.60 ? "investigate" :
    "dispute";

  const result: Omit<VerificationResult, "reportHash"> = {
    jobId:               scope.jobId,
    deliverableCount:    scope.deliverables.length,
    verifiedCount:       aiResult.verifiedCount,
    missingItems:        aiResult.missingItems,
    confidence:          parseFloat(blendedConfidence.toFixed(4)),
    confidenceBps:       Math.round(blendedConfidence * 10000),
    summary:             aiResult.summary,
    recommendation:      finalRecommendation,
    deterministicChecks,
    generatedAt:         new Date().toISOString(),
  };

  const reportHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(result))
    .digest("hex");

  return { ...result, reportHash };
}

// ─── Deterministic pre-checks (no AI required) ─────────────────────────────────
async function runDeterministicChecks(
  scope: ScopeDocument,
  proof: ProofPackage
): Promise<DeterministicCheck[]> {
  const checks: DeterministicCheck[] = [];

  // 1. Job ID match
  checks.push({
    label:  "Job ID match",
    passed: scope.jobId === proof.jobId,
    detail: scope.jobId === proof.jobId
      ? "Scope and proof reference the same job"
      : `Mismatch: scope=${scope.jobId} proof=${proof.jobId}`,
  });

  // 2. Deliverable count match
  const expectedCount  = scope.deliverables.length;
  const submittedCount = proof.deliverables.length;
  checks.push({
    label:  "Deliverable count",
    passed: submittedCount >= expectedCount,
    detail: `${submittedCount} submitted, ${expectedCount} required`,
  });

  // 3. All deliverable IDs covered
  const scopeIds  = new Set(scope.deliverables.map(d => d.id));
  const proofIds  = new Set(proof.deliverables.map(d => d.deliverableId));
  const covered   = [...scopeIds].every(id => proofIds.has(id));
  const missing   = [...scopeIds].filter(id => !proofIds.has(id));
  checks.push({
    label:  "All deliverable IDs covered",
    passed: covered,
    detail: covered ? "All IDs matched" : `Missing IDs: ${missing.join(", ")}`,
  });

  // 4. No empty proof content
  const emptyProofs = proof.deliverables.filter(d => !d.content?.trim());
  checks.push({
    label:  "No empty proof submissions",
    passed: emptyProofs.length === 0,
    detail: emptyProofs.length === 0
      ? "All deliverables have content"
      : `Empty submissions: ${emptyProofs.map(d => d.title).join(", ")}`,
  });

  // 5. Deadline not exceeded
  const deadlineDate  = new Date(scope.deadline);
  const submittedDate = new Date(proof.submittedAt);
  const onTime        = submittedDate <= deadlineDate;
  checks.push({
    label:  "Submitted before deadline",
    passed: onTime,
    detail: onTime
      ? `Submitted ${submittedDate.toISOString()} (deadline ${deadlineDate.toISOString()})`
      : `Late by ${Math.round((submittedDate.getTime() - deadlineDate.getTime()) / 86400000)}d`,
  });

  // 6. GitHub checks (for deliverables with GitHub URLs)
  const githubProofs = proof.deliverables.filter(d =>
    d.content?.includes("github.com") && d.type === "link"
  );
  for (const gp of githubProofs) {
    const check = await checkGitHubUrl(gp);
    checks.push(check);
  }

  // 7. Live URL reachability (for link deliverables that aren't GitHub)
  const urlProofs = proof.deliverables.filter(d =>
    d.type === "link" && !d.content?.includes("github.com") && d.content?.startsWith("http")
  );
  for (const up of urlProofs) {
    const check = await checkUrl(up.content, up.title);
    checks.push(check);
  }

  return checks;
}

// ─── GitHub URL verification ──────────────────────────────────────────────────
async function checkGitHubUrl(deliverable: ProofDeliverable): Promise<DeterministicCheck> {
  try {
    const url = deliverable.content.trim();

    // Parse GitHub URL: https://github.com/{owner}/{repo}
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) {
      return { label: `GitHub: ${deliverable.title}`, passed: false, detail: "Not a valid GitHub repo URL" };
    }

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 404) {
      return { label: `GitHub: ${deliverable.title}`, passed: false, detail: `Repo ${owner}/${repo} not found (private or deleted)` };
    }
    if (!res.ok) {
      return { label: `GitHub: ${deliverable.title}`, passed: false, detail: `GitHub API error: ${res.status}` };
    }

    const data: any = await res.json();
    const detail = `Repo exists: ${data.full_name}, ${data.size > 0 ? `${data.size}KB, ` : "empty, "}` +
                   `last push: ${data.pushed_at ? new Date(data.pushed_at).toLocaleDateString() : "never"}`;

    // Warn if repo is empty
    const passed = data.size > 0;
    return {
      label:  `GitHub: ${deliverable.title}`,
      passed,
      detail: passed ? detail : `Repo exists but appears empty (${data.size}KB). ${detail}`,
    };
  } catch (err: any) {
    return {
      label:  `GitHub: ${deliverable.title}`,
      passed: false,
      detail: `Could not check GitHub URL: ${err.message}`,
    };
  }
}

// ─── Generic URL reachability check ──────────────────────────────────────────
async function checkUrl(url: string, label: string): Promise<DeterministicCheck> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    return {
      label:  `URL reachable: ${label}`,
      passed: res.status >= 200 && res.status < 400,
      detail: `HTTP ${res.status} — ${res.ok ? "reachable" : "error"}`,
    };
  } catch (err: any) {
    return {
      label:  `URL reachable: ${label}`,
      passed: false,
      detail: `Unreachable: ${err.message}`,
    };
  }
}

// ─── AI semantic verification ─────────────────────────────────────────────────
async function runAIVerification(
  scope:               ScopeDocument,
  proof:               ProofPackage,
  deterministicChecks: DeterministicCheck[]
): Promise<{ verifiedCount: number; missingItems: string[]; confidence: number; summary: string }> {

  const deterministicSummary = deterministicChecks
    .map(c => `[${c.passed ? "PASS" : "FAIL"}] ${c.label}: ${c.detail}`)
    .join("\n");

  const prompt = `
SCOPE CONTRACT:
Job: ${scope.title}
Description: ${scope.description}
Deliverables:
${scope.deliverables.map((d, i) => `${i+1}. [ID:${d.id}] ${d.title}: ${d.description} (format: ${d.format ?? "any"})`).join("\n")}

FREELANCER PROOF:
${proof.deliverables.map((p, i) => `${i+1}. [ID:${p.deliverableId}] ${p.title} (${p.type}): ${p.content}`).join("\n")}
Notes: ${proof.notes || "none"}

PRE-CHECKS ALREADY RUN (deterministic):
${deterministicSummary}

IMPORTANT: AI cannot release funds. Your role is to generate verifiable evidence only.
Verify semantic completeness — does the proof match the scope description?

Respond ONLY with JSON:
{
  "deliverables": [{"id":"...","title":"...","verified":true/false,"reason":"one sentence"}],
  "overall_confidence": 0.0-1.0,
  "summary": "2-3 sentences",
  "recommendation": "release|investigate|dispute"
}`;

  try {
    const response = await client.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 1024,
      system:     `You are Aqoryn's impartial AI verification agent.
RULES:
1. Verify COMPLETENESS not quality — is the deliverable PRESENT?
2. Be NEUTRAL — no bias toward client or freelancer.
3. Base verdict ONLY on scope vs proof content.
4. URL presence = evidence. You cannot visit URLs.
5. Respond ONLY with the specified JSON. No preamble.`,
      messages: [{ role: "user", content: prompt }],
    });

    const raw   = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const clean = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    const verifiedCount = (parsed.deliverables ?? []).filter((d: any) => d.verified).length;
    const missingItems  = (parsed.deliverables ?? []).filter((d: any) => !d.verified).map((d: any) => d.title);

    return {
      verifiedCount,
      missingItems,
      confidence: parseFloat((parsed.overall_confidence ?? 0).toFixed(4)),
      summary:    parsed.summary ?? "",
    };
  } catch {
    // Fallback: use deterministic results only
    const passedCount = deterministicChecks.filter(c => c.passed).length;
    return {
      verifiedCount: 0,
      missingItems:  scope.deliverables.map(d => d.title),
      confidence:    0,
      summary:       "AI verification failed. Deterministic checks used only. Manual review recommended.",
    };
  }
}

// ─── Dispute evidence brief ────────────────────────────────────────────────────
export async function generateDisputeEvidence(
  scope:        ScopeDocument,
  proof:        ProofPackage,
  clientReason: string
): Promise<string> {
  const deterministicChecks = await runDeterministicChecks(scope, proof);
  const deterministicSummary = deterministicChecks
    .map(c => `[${c.passed ? "PASS" : "FAIL"}] ${c.label}: ${c.detail}`)
    .join("\n");

  const response = await client.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 2048,
    system:     `You are Aqoryn's impartial dispute analysis agent.
Produce structured evidence for arbitration jurors. Be completely neutral. Present facts only.`,
    messages: [{
      role: "user",
      content: `
DISPUTE: ${scope.title} — ${scope.amount} USDC
CLIENT REASON: ${clientReason}

SCOPE:
${scope.deliverables.map(d => `- ${d.title}: ${d.description}`).join("\n")}

FREELANCER PROOF:
${proof.deliverables.map(p => `- ${p.title} (${p.type}): ${p.content}`).join("\n")}

DETERMINISTIC CHECKS:
${deterministicSummary}

Produce arbitration brief:
1. Deliverable-by-deliverable evidence assessment
2. Is client's dispute reason supported by evidence?
3. Scope ambiguities (if any)
4. Neutral recommendation
5. Red flags on either side (if any)

Be concise — jurors decide in minutes.`
    }],
  });

  return response.content.filter(b => b.type === "text").map(b => b.text).join("");
}
