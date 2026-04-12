"use client";
import { useState } from "react";
import { Plus, Trash2, ArrowRight, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function CreateJobPage() {
  const [step, setStep] = useState<"details"|"deliverables"|"success">("details");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [freelancer, setFreelancer] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deliverables, setDeliverables] = useState([{title:"",description:"",format:""}]);

  const amountNum = parseFloat(amount) || 0;
  const fee = (amountNum * 50) / 10000;
  const payout = amountNum - fee;

  async function handleSubmit() {
    setLoading(true);
    toast.loading("Locking USDC in escrow…", {id:"tx"});
    await new Promise(r => setTimeout(r, 1500));
    toast.success(`${amountNum} USDC locked`, {id:"tx"});
    setLoading(false);
    setStep("success");
  }

  if (step === "success") return (
    <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold">Job created</h1>
      <p className="text-gray-400"><span className="font-semibold text-white">{amountNum} USDC</span> locked in escrow.</p>
      <div className="bg-white/5 rounded-2xl p-6 text-left space-y-3">
        <div className="flex justify-between text-sm"><span className="text-gray-500">Freelancer receives</span><span className="text-teal-400 font-semibold">{payout.toFixed(2)} USDC</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Protocol fee (0.5%)</span><span>{fee.toFixed(2)} USDC</span></div>
      </div>
      <a href="/dashboard" className="block w-full py-3 bg-teal-500 text-black font-semibold rounded-xl">Go to dashboard →</a>
    </div>
  );

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-teal-500 outline-none";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div><h1 className="text-3xl font-bold">Create a job</h1><p className="text-gray-400 mt-2">Lock funds. Freelancer gets paid when they deliver.</p></div>

      {step === "details" && (
        <div className="space-y-5">
          <div><label className="block text-sm font-medium mb-2">Job title</label><input className={inp} placeholder="e.g. Build a landing page" value={title} onChange={e=>setTitle(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-2">Description</label><textarea rows={3} className={`${inp} resize-none`} value={desc} onChange={e=>setDesc(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-2">Freelancer wallet</label><input className={`${inp} font-mono text-sm`} placeholder="Solana wallet address" value={freelancer} onChange={e=>setFreelancer(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-2">Amount (USDC)</label><input type="number" className={inp} placeholder="500" value={amount} onChange={e=>setAmount(e.target.value)} />{amountNum>0&&<p className="text-xs text-gray-500 mt-1">Freelancer gets {payout.toFixed(2)} USDC</p>}</div>
            <div><label className="block text-sm font-medium mb-2">Deadline</label><input type="date" className={inp} value={deadline} onChange={e=>setDeadline(e.target.value)} /></div>
          </div>
          <button onClick={()=>setStep("deliverables")} disabled={!title||!amount||!deadline} className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-white/10 disabled:text-gray-600 text-black font-semibold rounded-xl flex items-center justify-center gap-2">
            Next: Define deliverables <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === "deliverables" && (
        <div className="space-y-5">
          {deliverables.map((d,i)=>(
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between"><span className="text-sm font-medium text-teal-400">Deliverable {i+1}</span>{deliverables.length>1&&<button onClick={()=>setDeliverables(d=>d.filter((_,idx)=>idx!==i))} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}</div>
              <input className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-gray-600 focus:border-teal-500 outline-none" placeholder="Title" value={d.title} onChange={e=>setDeliverables(ds=>ds.map((x,idx)=>idx===i?{...x,title:e.target.value}:x))} />
              <input className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-gray-600 focus:border-teal-500 outline-none" placeholder="Description" value={d.description} onChange={e=>setDeliverables(ds=>ds.map((x,idx)=>idx===i?{...x,description:e.target.value}:x))} />
            </div>
          ))}
          <button onClick={()=>setDeliverables(d=>[...d,{title:"",description:"",format:""}])} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-sm text-gray-500 flex items-center justify-center gap-2"><Plus className="w-4 h-4"/>Add deliverable</button>
          <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4 flex gap-3"><Shield className="w-5 h-5 text-teal-400 flex-shrink-0"/><p className="text-sm text-gray-300">Funds lock on-chain. Auto-release 48h after proof if AI confidence ≥ 75%.</p></div>
          <div className="flex gap-3">
            <button onClick={()=>setStep("details")} className="px-6 py-3 border border-white/10 rounded-xl text-gray-400 text-sm">Back</button>
            <button onClick={handleSubmit} disabled={loading||deliverables.some(d=>!d.title)} className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-white/10 text-black font-semibold rounded-xl text-sm">
              {loading ? "Locking funds…" : `Lock ${amountNum} USDC`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
