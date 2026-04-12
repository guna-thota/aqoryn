"use client";
import { useState } from "react";
import { Shield, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function JobDetailClient() {
  const [state, setState] = useState("Delivered");
  const [loading, setLoading] = useState<string | null>(null);

  async function simulate(action: string, newState: string, msg: string) {
    setLoading(action);
    await new Promise(r => setTimeout(r, 1400));
    setState(newState);
    toast.success(msg);
    setLoading(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Build React landing page for Aqoryn</h1>
          <p className="text-gray-400 mt-1 text-sm">Mobile-first, Tailwind CSS, Phantom wallet connect, 3 sections</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 ${
          state === "Released" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
          state === "Disputed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
        }`}>{state}</span>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-teal-400" /><span className="font-medium text-sm">Escrow</span></div>
        <div className="grid grid-cols-3 gap-4">
          <div><div className="text-xs text-gray-500 mb-1">Locked</div><div className="text-xl font-bold text-teal-400">500 USDC</div></div>
          <div><div className="text-xs text-gray-500 mb-1">Freelancer gets</div><div className="text-xl font-bold">497.50 USDC</div></div>
          <div><div className="text-xs text-gray-500 mb-1">Protocol fee</div><div className="text-xl font-bold text-gray-500">2.50 USDC</div></div>
        </div>
        {state === "Delivered" && (
          <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3 bg-yellow-500/10 text-yellow-400">
            <Clock className="w-4 h-4" /> Auto-release in 34h if no action taken
          </div>
        )}
        {state === "Released" && (
          <div className="flex items-center gap-2 text-sm text-teal-400 bg-teal-500/10 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4" /> Funds released · freelancer received 497.50 USDC
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2"><span>🤖</span><span className="font-medium text-sm">AI Verification — 94% confidence</span></div>
        <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-teal-500 h-2 rounded-full" style={{width:"94%"}} /></div>
        <div className="space-y-1">
          {["Job ID match","All deliverable IDs covered","GitHub repo exists (1.2MB)","Vercel URL → HTTP 200","Submitted before deadline"].map(c => (
            <div key={c} className="flex items-center gap-2 text-xs text-gray-400"><span className="text-teal-400">✓</span>{c}</div>
          ))}
        </div>
        <p className="text-xs text-amber-400/70 italic">AI cannot release funds. It only generates verifiable evidence.</p>
      </div>

      {state === "Delivered" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-medium">Client actions</h3>
          <div className="flex gap-3">
            <button onClick={() => simulate("dispute","Disputed","Dispute raised")} disabled={!!loading}
              className="flex-1 py-3 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />{loading === "dispute" ? "Raising…" : "Raise dispute"}
            </button>
            <button onClick={() => simulate("approve","Released","497.50 USDC released")} disabled={!!loading}
              className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />{loading === "approve" ? "Releasing…" : "Approve & release"}
            </button>
          </div>
        </div>
      )}

      {state === "Released" && (
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl">🏆</div>
          <h3 className="font-semibold text-teal-400">Proof-of-Work NFT minted</h3>
          <p className="text-sm text-gray-400">Soul-bound token in freelancer wallet. Permanent, portable reputation.</p>
        </div>
      )}
    </div>
  );
}
