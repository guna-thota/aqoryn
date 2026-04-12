"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";

const DELIVERABLES = [
  { id: "1", title: "Responsive homepage", format: "GitHub URL" },
  { id: "2", title: "Wallet connect button", format: "GitHub URL" },
  { id: "3", title: "Live deployment", format: "URL" },
];

export default function SubmitProofClient() {
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    toast.success("Proof submitted and verified");
    setDone(true);
    setLoading(false);
  }

  if (done) return (
    <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
      <div className="text-6xl">✅</div>
      <h1 className="text-3xl font-bold">Proof submitted</h1>
      <p className="text-gray-400">Client has 48 hours to review. Silence = auto-release.</p>
      <a href="/dashboard" className="block w-full py-3 bg-teal-500 text-black font-semibold rounded-xl">Go to dashboard →</a>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Submit proof of delivery</h1>
        <p className="text-gray-400 mt-2 text-sm">AI will verify your submission against the agreed scope.</p>
      </div>
      {DELIVERABLES.map(d => (
        <div key={d.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <div><span className="text-xs text-teal-400">Deliverable {d.id}</span><span className="text-xs text-gray-500 ml-2">{d.format}</span></div>
          <h3 className="font-medium">{d.title}</h3>
          <input
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:border-teal-500 outline-none"
            placeholder={d.format === "URL" ? "https://your-deployment.vercel.app" : "https://github.com/you/repo"}
            value={contents[d.id] ?? ""}
            onChange={e => setContents(c => ({...c, [d.id]: e.target.value}))}
          />
        </div>
      ))}
      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 text-black font-semibold rounded-xl flex items-center justify-center gap-2">
        <Upload className="w-4 h-4" />{loading ? "Submitting…" : "Submit proof & trigger AI verification"}
      </button>
    </div>
  );
}
