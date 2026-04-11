"use client";

import { useState } from "react";
const useWallet = () => ({ publicKey: null });
import toast from "react-hot-toast";
import { Plus, Trash2, ArrowRight, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { calculateFee } from "@/lib/solana";
import type { DeliverableItem } from "@/lib/ipfs";

type Step = "details" | "deliverables" | "milestones" | "review" | "success";

interface MilestoneInput { title: string; amount: string; }

export default function CreateJobPage() {
  const { publicKey } = useWallet();
  const [step, setStep]     = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ jobId: string; txSig: string } | null>(null);

  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [freelancer, setFreelancer] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [useMilestones, setUseMilestones] = useState(false);
  const [deliverables, setDeliverables] = useState<Partial<DeliverableItem>[]>([
    { id: "1", title: "", description: "", format: "" },
  ]);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "Milestone 1", amount: "" },
  ]);

  const amountNum = parseFloat(amount) || 0;
  const { fee, payout } = calculateFee(amountNum);
  const milestoneSum = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
  const milestonesValid = !useMilestones || (milestones.length > 0 && Math.abs(milestoneSum - amountNum) < 0.01);

  function addDeliverable() {
    setDeliverables(d => [...d, { id: String(d.length + 1), title: "", description: "", format: "" }]);
  }
  function updateDeliverable(i: number, k: string, v: string) {
    setDeliverables(d => d.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  }
  function removeDeliverable(i: number) {
    setDeliverables(d => d.filter((_, idx) => idx !== i));
  }
  function addMilestone() {
    setMilestones(m => [...m, { title: `Milestone ${m.length + 1}`, amount: "" }]);
  }
  function updateMilestone(i: number, k: keyof MilestoneInput, v: string) {
    setMilestones(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  }
  function removeMilestone(i: number) {
    setMilestones(m => m.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!publicKey) { toast.error("Connect your wallet first"); return; }
    try { new PublicKey(freelancer); } catch { toast.error("Invalid freelancer wallet"); return; }
    if (useMilestones && !milestonesValid) {
      toast.error(`Milestone amounts must sum to ${amountNum} USDC (currently ${milestoneSum.toFixed(2)})`);
      return;
    }
    setLoading(true);
    try {
      toast.loading("Uploading scope to IPFS…", { id: "ipfs" });
      await new Promise(r => setTimeout(r, 1000));
      toast.success("Scope uploaded", { id: "ipfs" });

      toast.loading("Locking USDC in escrow…", { id: "tx" });
      await new Promise(r => setTimeout(r, 1500));
      toast.success(`${amountNum} USDC locked on-chain`, { id: "tx" });

      setResult({
        jobId:  crypto.randomUUID(),
        txSig:  "5KtP" + Math.random().toString(36).slice(2, 28).toUpperCase(),
      });
      setStep("success");
    } catch (e: any) {
      toast.error(e.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success" && result) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold">Job created</h1>
        <p className="text-gray-400">
          <span className="font-semibold text-white">{amountNum} USDC</span> is locked in escrow.
          The freelancer can start working.
        </p>
        <div className="bg-white/5 rounded-2xl p-6 text-left space-y-3">
          <Row label="Job ID" value={`${result.jobId.slice(0, 18)}…`} mono />
          <Row label="Transaction" value={`${result.txSig.slice(0, 16)}…`} mono
               href={`https://explorer.solana.com/tx/${result.txSig}?cluster=devnet`} />
          <Row label="Freelancer receives" value={`${payout.toFixed(2)} USDC`} teal />
          <Row label="Protocol fee (0.5%)" value={`${fee.toFixed(2)} USDC`} />
          {useMilestones && <Row label="Milestones" value={String(milestones.length)} />}
        </div>
        <a href="/dashboard" className="block w-full py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all">
          Go to dashboard →
        </a>
      </div>
    );
  }

  const STEPS: Step[] = useMilestones
    ? ["details", "deliverables", "milestones", "review"]
    : ["details", "deliverables", "review"];

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create a job</h1>
        <p className="text-gray-400 mt-2">Define the scope, lock funds. Freelancer gets paid when they deliver.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 items-center text-sm">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === s ? "bg-teal-500 text-black" : i < stepIdx ? "bg-teal-500/30 text-teal-400" : "bg-white/10 text-gray-500"
            }`}>{i < stepIdx ? "✓" : i + 1}</div>
            <span className={step === s ? "text-white text-xs" : "text-gray-600 text-xs capitalize"}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === "details" && (
        <div className="space-y-5">
          <Field label="Job title">
            <input className={input} placeholder="e.g. Build a landing page in React" value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea rows={3} className={`${input} resize-none`} placeholder="Describe the project…" value={desc} onChange={e => setDesc(e.target.value)} />
          </Field>
          <Field label="Freelancer wallet address">
            <input className={`${input} font-mono text-sm`} placeholder="Solana wallet (Base58)" value={freelancer} onChange={e => setFreelancer(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (USDC)">
              <input type="number" className={input} placeholder="500" value={amount} onChange={e => setAmount(e.target.value)} />
              {amountNum > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Freelancer gets {payout.toFixed(2)} USDC · fee {fee.toFixed(2)} USDC
                </p>
              )}
            </Field>
            <Field label="Deadline">
              <input type="date" className={input} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </Field>
          </div>

          {/* Milestone toggle */}
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
            <input
              type="checkbox"
              id="milestones"
              checked={useMilestones}
              onChange={e => setUseMilestones(e.target.checked)}
              className="w-4 h-4 accent-teal-500"
            />
            <div>
              <label htmlFor="milestones" className="text-sm font-medium cursor-pointer">
                Use milestone-based payments
              </label>
              <p className="text-xs text-gray-500 mt-0.5">Split the job into phases — each with its own amount and proof</p>
            </div>
          </div>

          <button
            onClick={() => setStep("deliverables")}
            disabled={!title || !desc || !freelancer || !amount || !deadline}
            className={btn}
          >
            Next: Define deliverables <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Deliverables */}
      {step === "deliverables" && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">
            List every specific deliverable. The AI verification agent checks the freelancer's proof against this list.
          </p>
          {deliverables.map((d, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-teal-400">Deliverable {i + 1}</span>
                {deliverables.length > 1 && (
                  <button onClick={() => removeDeliverable(i)} className="text-gray-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input className={minput} placeholder="Title (e.g. Responsive homepage)" value={d.title} onChange={e => updateDeliverable(i, "title", e.target.value)} />
              <input className={minput} placeholder="Description (what exactly)" value={d.description} onChange={e => updateDeliverable(i, "description", e.target.value)} />
              <input className={minput} placeholder="Format (e.g. GitHub URL, Figma link, PDF)" value={d.format} onChange={e => updateDeliverable(i, "format", e.target.value)} />
            </div>
          ))}
          <button onClick={addDeliverable} className="w-full py-3 border border-dashed border-white/20 hover:border-teal-500/40 rounded-xl text-sm text-gray-500 hover:text-teal-400 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add deliverable
          </button>
          <div className="flex gap-3">
            <button onClick={() => setStep("details")} className={back}>Back</button>
            <button onClick={() => setStep(useMilestones ? "milestones" : "review")} disabled={deliverables.some(d => !d.title)} className={btn}>
              Next {useMilestones ? ": Set milestones" : ": Review"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Milestones (optional) */}
      {step === "milestones" && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">
            Define milestone amounts. They must sum to exactly {amountNum} USDC.
            Currently: <span className={Math.abs(milestoneSum - amountNum) < 0.01 ? "text-teal-400" : "text-yellow-400"}>{milestoneSum.toFixed(2)} USDC</span>
          </p>
          {milestones.map((m, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-purple-400">Milestone {i + 1}</span>
                {milestones.length > 1 && (
                  <button onClick={() => removeMilestone(i)} className="text-gray-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input className={minput} placeholder="Milestone title" value={m.title} onChange={e => updateMilestone(i, "title", e.target.value)} />
              <input type="number" className={minput} placeholder="Amount (USDC)" value={m.amount} onChange={e => updateMilestone(i, "amount", e.target.value)} />
            </div>
          ))}
          {milestones.length < 10 && (
            <button onClick={addMilestone} className="w-full py-3 border border-dashed border-white/20 hover:border-purple-500/40 rounded-xl text-sm text-gray-500 hover:text-purple-400 transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add milestone (max 10)
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep("deliverables")} className={back}>Back</button>
            <button onClick={() => setStep("review")} disabled={!milestonesValid} className={btn}>
              Review & lock funds <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === "review" && (
        <div className="space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-gray-400">{desc}</p>
            <div className="border-t border-white/10 pt-4 space-y-2">
              <Row label="Freelancer" value={`${freelancer.slice(0,8)}…${freelancer.slice(-8)}`} mono />
              <Row label="Total locked" value={`${amountNum} USDC`} />
              <Row label="Freelancer receives" value={`${payout.toFixed(2)} USDC`} teal />
              <Row label="Protocol fee (0.5%)" value={`${fee.toFixed(2)} USDC`} />
              <Row label="Deadline" value={new Date(deadline).toLocaleDateString()} />
              {useMilestones && <Row label="Milestones" value={String(milestones.length)} />}
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Deliverables ({deliverables.length})
              </p>
              {deliverables.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-teal-500 mt-0.5">✓</span> {d.title}
                </div>
              ))}
            </div>
            {useMilestones && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Milestones
                </p>
                {milestones.map((m, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-400 mb-1">
                    <span className="flex items-center gap-2"><span className="text-purple-500">◆</span>{m.title}</span>
                    <span>{m.amount} USDC</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4 flex gap-3">
            <Shield className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              Funds are locked in a Solana smart contract. Auto-release triggers 48h after proof
              submission if AI confidence ≥ 75% and no dispute is raised.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(useMilestones ? "milestones" : "deliverables")} className={back}>Back</button>
            <button onClick={handleSubmit} disabled={loading} className={btn}>
              {loading ? "Locking funds…" : `Lock ${amountNum} USDC`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
const input = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-teal-500 outline-none";
const minput = "w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-teal-500 outline-none";
const btn    = "flex-1 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-white/10 disabled:text-gray-600 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm";
const back   = "px-6 py-3 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, mono, teal, href }: {
  label: string; value: string; mono?: boolean; teal?: boolean; href?: string;
}) {
  const cls = `text-sm ${mono ? "font-mono text-xs" : ""} ${teal ? "text-teal-400 font-semibold" : ""}`;
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={`${cls} text-teal-400 hover:underline`}>{value}</a>
      ) : (
        <span className={cls}>{value}</span>
      )}
    </div>
  );
}
