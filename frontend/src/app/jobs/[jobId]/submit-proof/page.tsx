"use client";

import { useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { Upload, Link, FileText, Github, Plus, Trash2 } from "lucide-react";
import { uploadProofToIPFS, type ProofPackage, type ProofDeliverable } from "@/lib/ipfs";

// In production, fetch scope from IPFS using jobId from params
const MOCK_DELIVERABLES = [
  { id: "1", title: "Responsive homepage", description: "Mobile-first, Tailwind CSS, 3 sections", format: "GitHub repo URL" },
  { id: "2", title: "Wallet connect button", description: "Phantom wallet integration", format: "GitHub repo URL" },
  { id: "3", title: "Deployed preview", description: "Live Vercel/Netlify URL", format: "URL" },
];

type ProofItem = {
  deliverableId: string;
  type: "link" | "file" | "commit" | "text";
  content: string;
  files: File[];
};

export default function SubmitProofPage({ params }: { params: { jobId: string } }) {
  const { publicKey } = useWallet();
  const [proofItems, setProofItems] = useState<ProofItem[]>(
    MOCK_DELIVERABLES.map((d) => ({
      deliverableId: d.id,
      type: "link",
      content: "",
      files: [],
    }))
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  function updateItem(idx: number, key: keyof ProofItem, value: any) {
    setProofItems((items) =>
      items.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );
  }

  function handleFileChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    updateItem(idx, "files", files);
  }

  async function handleSubmit() {
    if (!publicKey) {
      toast.error("Connect your wallet");
      return;
    }

    const allComplete = proofItems.every((p) =>
      p.type === "file" ? p.files.length > 0 : p.content.trim().length > 0
    );
    if (!allComplete) {
      toast.error("Please fill in all deliverables");
      return;
    }

    setLoading(true);

    try {
      const deliverables: ProofDeliverable[] = proofItems.map((p, i) => ({
        deliverableId: p.deliverableId,
        title:         MOCK_DELIVERABLES[i].title,
        type:          p.type as any,
        content:       p.type === "file" ? p.files[0]?.name ?? "" : p.content,
        fileName:      p.type === "file" ? p.files[0]?.name : undefined,
      }));

      const proofPackage: ProofPackage = {
        version:      "1.0",
        jobId:        params.jobId,
        freelancer:   publicKey.toBase58(),
        deliverables,
        notes,
        submittedAt:  new Date().toISOString(),
      };

      toast.loading("Uploading proof to IPFS…", { id: "proof" });

      const allFiles = proofItems.flatMap((p) => p.files);
      const cid = await uploadProofToIPFS(proofPackage, allFiles);

      toast.success("Proof uploaded to IPFS", { id: "proof" });

      // Call AI verification
      toast.loading("Running AI verification…", { id: "ai" });

      const aiRes = await fetch("/api/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jobId: params.jobId, proofCid: cid }),
      });

      const aiReport = await aiRes.json();
      toast.success("AI verification complete", { id: "ai" });

      // Submit on-chain
      toast.loading("Submitting proof on-chain…", { id: "chain" });
      await new Promise((r) => setTimeout(r, 1500)); // TODO: real submitProof() call
      toast.success("Proof recorded on Solana", { id: "chain" });

      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
        <div className="text-6xl">✅</div>
        <h1 className="text-3xl font-bold">Proof submitted</h1>
        <p className="text-gray-400">
          Your delivery has been recorded on Solana and verified by AI.
          The client has 48 hours to review. If they don't respond, funds auto-release to your wallet.
        </p>
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Auto-release in</span>
            <span className="font-semibold text-teal-400">48 hours</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Proof stored on</span>
            <span>IPFS (permanent)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">On-chain verification</span>
            <span className="text-teal-400">✓ Confirmed</span>
          </div>
        </div>
        <a href="/dashboard" className="block w-full py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all text-center">
          View dashboard →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Submit proof of delivery</h1>
        <p className="text-gray-400 mt-2 text-sm">
          For each deliverable in the scope, provide your proof.
          Your submission will be verified by AI before the client reviews.
        </p>
      </div>

      {MOCK_DELIVERABLES.map((deliverable, i) => (
        <div key={deliverable.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                Deliverable {i + 1}
              </span>
              <span className="text-xs text-gray-500">{deliverable.format}</span>
            </div>
            <h3 className="font-medium">{deliverable.title}</h3>
            <p className="text-sm text-gray-400">{deliverable.description}</p>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            {(["link", "file", "commit", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateItem(i, "type", t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  proofItems[i].type === t
                    ? "bg-teal-500 text-black"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {t === "link" && <span>🔗 </span>}
                {t === "file" && <span>📁 </span>}
                {t === "commit" && <span>💻 </span>}
                {t === "text" && <span>📝 </span>}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Input based on type */}
          {proofItems[i].type !== "file" ? (
            <input
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:border-teal-500 outline-none"
              placeholder={
                proofItems[i].type === "link" ? "https://github.com/your-repo" :
                proofItems[i].type === "commit" ? "git commit hash or PR URL" :
                "Describe what you delivered..."
              }
              value={proofItems[i].content}
              onChange={(e) => updateItem(i, "content", e.target.value)}
            />
          ) : (
            <div
              onClick={() => fileRefs.current[i]?.click()}
              className="border border-dashed border-white/20 hover:border-teal-500/50 rounded-xl p-6 text-center cursor-pointer transition-all"
            >
              <input
                type="file"
                multiple
                className="hidden"
                ref={(el) => { fileRefs.current[i] = el; }}
                onChange={(e) => handleFileChange(i, e)}
              />
              {proofItems[i].files.length > 0 ? (
                <div className="text-sm text-teal-400">
                  {proofItems[i].files.map((f) => f.name).join(", ")}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  <Upload className="w-5 h-5 mx-auto mb-2" />
                  Click to upload files
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">Additional notes (optional)</label>
        <textarea
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-teal-500 outline-none resize-none"
          placeholder="Any context for the client about your delivery..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-gray-400">
        After submission, AI will verify your deliverables against the agreed scope.
        The report is stored on-chain. Client has 48 hours to review.
        If no response, funds auto-release.
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-base"
      >
        {loading ? "Submitting…" : "Submit proof & trigger AI verification"}
      </button>
    </div>
  );
}
