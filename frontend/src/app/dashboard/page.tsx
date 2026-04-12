"use client";
import Link from "next/link";
import { Clock, Shield, CheckCircle, AlertTriangle, Plus, ArrowRight } from "lucide-react";

const MOCK_JOBS = [
  { jobId: "550e8400", title: "React landing page for Aqoryn", amount: 500, state: "Delivered", createdAt: new Date(Date.now() - 3 * 86400_000) },
  { jobId: "661f9511", title: "Figma design system", amount: 800, state: "Locked", createdAt: new Date(Date.now() - 86400_000) },
  { jobId: "772g0622", title: "Smart contract audit", amount: 1500, state: "Released", createdAt: new Date(Date.now() - 10 * 86400_000) },
];

export default function DashboardPage() {
  const totalEarned = MOCK_JOBS.filter(j => j.state === "Released").reduce((s, j) => s + j.amount * 0.995, 0);
  const pending = MOCK_JOBS.filter(j => j.state === "Delivered").reduce((s, j) => s + j.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/jobs/create" className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl text-sm">
          <Plus className="w-4 h-4" /> New job
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-xs text-gray-500 mb-1">Active jobs</div><div className="text-2xl font-bold">2</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-xs text-gray-500 mb-1">Pending release</div><div className="text-2xl font-bold text-yellow-400">{pending} USDC</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-xs text-gray-500 mb-1">Total settled</div><div className="text-2xl font-bold text-teal-400">{totalEarned.toFixed(0)} USDC</div></div>
      </div>
      <div className="space-y-3">
        {MOCK_JOBS.map(job => (
          <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{job.createdAt.toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{job.amount} USDC</span>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  job.state === "Released" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
                  job.state === "Delivered" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                  "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>{job.state}</span>
                <ArrowRight className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
