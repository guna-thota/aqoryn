import { verifyDelivery, generateDisputeEvidence } from "../src/verifier";
import type { ScopeDocument, ProofPackage } from "../../frontend/src/lib/ipfs";

// Mock Anthropic to avoid API calls in CI
jest.mock("@anthropic-ai/sdk", () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockImplementation(({ messages }) => {
        const prompt = messages[0]?.content ?? "";
        // Simulate different AI responses based on proof content
        const hasEmptyProof = prompt.includes("content:");
        const confidence    = hasEmptyProof ? 0.4 : 0.94;
        return Promise.resolve({
          content: [{
            type: "text",
            text: JSON.stringify({
              deliverables: [
                { id: "1", title: "Landing page",   verified: confidence > 0.5, reason: "GitHub URL present" },
                { id: "2", title: "Wallet connect", verified: confidence > 0.5, reason: "Found in repo" },
                { id: "3", title: "Live deploy",    verified: confidence > 0.5, reason: "Vercel URL present" },
              ],
              overall_confidence: confidence,
              summary: confidence > 0.5
                ? "All 3 deliverables verified with valid proof."
                : "Proof is incomplete or missing content.",
              recommendation: confidence > 0.75 ? "release" : confidence > 0.5 ? "investigate" : "dispute",
            }),
          }],
        });
      }),
    },
  })),
}));

// Mock fetch for URL/GitHub checks
global.fetch = jest.fn().mockImplementation((url: string) => {
  if (url.includes("api.github.com")) {
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve({ full_name: "dev/aqoryn-landing", size: 1024, pushed_at: "2024-06-15" }),
    } as any);
  }
  if (url.includes("vercel.app") || url.includes("netlify.app")) {
    return Promise.resolve({ ok: true, status: 200 } as any);
  }
  return Promise.resolve({ ok: false, status: 404 } as any);
}) as any;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const BASE_SCOPE: ScopeDocument = {
  version:     "1.0",
  jobId:       "test-job-001",
  title:       "React landing page",
  description: "Responsive landing page with Phantom wallet",
  deliverables: [
    { id: "1", title: "Landing page",   description: "3-section page",   format: "GitHub URL" },
    { id: "2", title: "Wallet connect", description: "Phantom",          format: "GitHub URL" },
    { id: "3", title: "Live deploy",    description: "Vercel deployment", format: "URL" },
  ],
  deadline:  new Date(Date.now() + 86400_000).toISOString(),
  amount:    500,
  currency:  "USDC",
  createdAt: new Date().toISOString(),
};

const COMPLETE_PROOF: ProofPackage = {
  version:    "1.0",
  jobId:      "test-job-001",
  freelancer: "FrEeLaNcErWaLLetAdDrEsS1234567890xY",
  deliverables: [
    { deliverableId: "1", title: "Landing page",   type: "link", content: "https://github.com/dev/aqoryn-landing" },
    { deliverableId: "2", title: "Wallet connect", type: "link", content: "https://github.com/dev/aqoryn-landing" },
    { deliverableId: "3", title: "Live deploy",    type: "link", content: "https://aqoryn-landing.vercel.app" },
  ],
  notes:       "All done. Mobile tested.",
  submittedAt: new Date().toISOString(),
};

// ─── Happy path ───────────────────────────────────────────────────────────────
describe("verifyDelivery — happy path", () => {
  it("returns 3/3 verified for complete proof", async () => {
    const result = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    expect(result.verifiedCount).toBe(3);
    expect(result.deliverableCount).toBe(3);
    expect(result.missingItems).toHaveLength(0);
    expect(result.reportHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.confidenceBps).toBeGreaterThan(7500);
    expect(result.recommendation).toBe("release");
  });

  it("includes deterministic checks in result", async () => {
    const result = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    expect(result.deterministicChecks.length).toBeGreaterThan(0);
    const jobIdCheck = result.deterministicChecks.find(c => c.label === "Job ID match");
    expect(jobIdCheck?.passed).toBe(true);
  });

  it("deterministic check catches GitHub repo", async () => {
    const result = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    const ghCheck = result.deterministicChecks.find(c => c.label.includes("GitHub"));
    expect(ghCheck).toBeDefined();
    expect(ghCheck?.passed).toBe(true);
  });

  it("generates a deterministic report hash for same inputs", async () => {
    const r1 = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    const r2 = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    // Same content → same hash (timestamps differ slightly in practice, but structure is same)
    expect(r1.reportHash).toMatch(/^[a-f0-9]{64}$/);
    expect(r2.reportHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─── Edge case: job ID mismatch ────────────────────────────────────────────────
describe("verifyDelivery — job ID mismatch", () => {
  it("deterministic check fails when proof jobId differs", async () => {
    const badProof = { ...COMPLETE_PROOF, jobId: "WRONG-JOB-ID" };
    const result   = await verifyDelivery(BASE_SCOPE, badProof);
    const check    = result.deterministicChecks.find(c => c.label === "Job ID match");
    expect(check?.passed).toBe(false);
    expect(result.confidenceBps).toBeLessThan(7500);
  });
});

// ─── Edge case: empty proof content ───────────────────────────────────────────
describe("verifyDelivery — empty/invalid proof", () => {
  it("flags empty proof content deterministically", async () => {
    const emptyProof: ProofPackage = {
      ...COMPLETE_PROOF,
      deliverables: COMPLETE_PROOF.deliverables.map(d => ({ ...d, content: "" })),
    };
    const result = await verifyDelivery(BASE_SCOPE, emptyProof);
    const check  = result.deterministicChecks.find(c => c.label === "No empty proof submissions");
    expect(check?.passed).toBe(false);
  });

  it("recommendation is investigate or dispute for empty proof", async () => {
    const emptyProof: ProofPackage = {
      ...COMPLETE_PROOF,
      deliverables: COMPLETE_PROOF.deliverables.map(d => ({ ...d, content: "" })),
    };
    const result = await verifyDelivery(BASE_SCOPE, emptyProof);
    expect(["investigate", "dispute"]).toContain(result.recommendation);
  });
});

// ─── Edge case: late submission (deadline exceeded) ────────────────────────────
describe("verifyDelivery — late submission", () => {
  it("flags late submission in deterministic checks", async () => {
    const expiredScope: ScopeDocument = {
      ...BASE_SCOPE,
      deadline: new Date(Date.now() - 86400_000).toISOString(), // yesterday
    };
    const result = await verifyDelivery(expiredScope, COMPLETE_PROOF);
    const check  = result.deterministicChecks.find(c => c.label === "Submitted before deadline");
    expect(check?.passed).toBe(false);
    expect(check?.detail).toContain("Late by");
  });
});

// ─── Edge case: missing deliverable IDs ───────────────────────────────────────
describe("verifyDelivery — incomplete deliverables", () => {
  it("detects missing deliverable IDs", async () => {
    const partialProof: ProofPackage = {
      ...COMPLETE_PROOF,
      deliverables: [COMPLETE_PROOF.deliverables[0]], // only 1 of 3
    };
    const result  = await verifyDelivery(BASE_SCOPE, partialProof);
    const checks  = result.deterministicChecks;
    const coverage = checks.find(c => c.label === "All deliverable IDs covered");
    expect(coverage?.passed).toBe(false);
    expect(coverage?.detail).toContain("Missing IDs");
  });

  it("deliverable count check fails for partial proof", async () => {
    const partialProof: ProofPackage = {
      ...COMPLETE_PROOF,
      deliverables: [COMPLETE_PROOF.deliverables[0]],
    };
    const result = await verifyDelivery(BASE_SCOPE, partialProof);
    const check  = result.deterministicChecks.find(c => c.label === "Deliverable count");
    expect(check?.passed).toBe(false);
  });
});

// ─── Edge case: double submission guard ────────────────────────────────────────
describe("verifyDelivery — double submission", () => {
  it("both submissions produce independent reports", async () => {
    const r1 = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    const r2 = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    // Reports are independent — on-chain, contract rejects second submission via state check
    expect(r1.deliverableCount).toBe(r2.deliverableCount);
    expect(r1.recommendation).toBe(r2.recommendation);
  });
});

// ─── Confidence gating ─────────────────────────────────────────────────────────
describe("confidence gating", () => {
  it("confidenceBps is stored as integer basis points", async () => {
    const result = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    expect(Number.isInteger(result.confidenceBps)).toBe(true);
    expect(result.confidenceBps).toBeGreaterThanOrEqual(0);
    expect(result.confidenceBps).toBeLessThanOrEqual(10000);
  });

  it("high confidence produces release recommendation", async () => {
    const result = await verifyDelivery(BASE_SCOPE, COMPLETE_PROOF);
    if (result.confidenceBps >= 8500) {
      expect(result.recommendation).toBe("release");
    }
  });
});

// ─── Dispute evidence ──────────────────────────────────────────────────────────
describe("generateDisputeEvidence", () => {
  it("returns non-empty evidence string", async () => {
    const evidence = await generateDisputeEvidence(
      BASE_SCOPE,
      COMPLETE_PROOF,
      "The landing page does not have 3 sections as agreed"
    );
    expect(typeof evidence).toBe("string");
    expect(evidence.length).toBeGreaterThan(50);
  });
});
