"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FlowVisualizer from "./FlowVisualizer";

type ScenarioId = "success" | "dispute" | "fraud";

interface Step {
id: string;
label: string;
sub: string;
color?: string;
detail: string;
trustDelta: number;
}

const COLORS: Record<string, any> = {
blue:   { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
amber:  { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
green:  { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" },
red:    { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
gray:   { bg: "bg-white/5", border: "border-white/10", text: "text-gray-500" }
};

const STEPS: Record<ScenarioId, Step[]> = {
success: [
{ id: "client", label: "Client creates job", sub: "Stored on-chain", color: "blue", detail: "Job created", trustDelta: 10 },
{ id: "escrow", label: "Funds locked", sub: "USDC escrow", color: "blue", detail: "500 USDC locked", trustDelta: 20 },
{ id: "ai", label: "AI verifies work", sub: "Smart validation", color: "amber", detail: "Confidence 94%", trustDelta: 25 },
{ id: "release", label: "Funds released", sub: "Auto payout", color: "green", detail: "Freelancer paid", trustDelta: 20 }
],
dispute: [
{ id: "client", label: "Job created", sub: "", color: "blue", detail: "", trustDelta: 10 },
{ id: "escrow", label: "Funds locked", sub: "", color: "blue", detail: "", trustDelta: 20 },
{ id: "ai", label: "Partial verification", sub: "", color: "amber", detail: "", trustDelta: 10 },
{ id: "release", label: "DAO resolves dispute", sub: "", color: "green", detail: "", trustDelta: 15 }
],
fraud: [
{ id: "client", label: "Job created", sub: "", color: "blue", detail: "", trustDelta: 10 },
{ id: "escrow", label: "Funds locked", sub: "", color: "blue", detail: "", trustDelta: 15 },
{ id: "ai", label: "Fraud detected", sub: "", color: "red", detail: "", trustDelta: -20 },
{ id: "release", label: "Refund issued", sub: "", color: "green", detail: "", trustDelta: 20 }
]
};

export default function DemoPage() {
const [scenario, setScenario] = useState<ScenarioId>("success");
const [completed, setCompleted] = useState<string[]>([]);
const [active, setActive] = useState<string | null>(null);
const [trust, setTrust] = useState(30);

const steps = STEPS[scenario];

async function runAll() {
for (const step of steps) {
setActive(step.id);
await new Promise(r => setTimeout(r, 1000));
setCompleted(prev => [...prev, step.id]);
setTrust(t => Math.max(0, Math.min(100, t + step.trustDelta)));
setActive(null);
}
}

function reset() {
setCompleted([]);
setActive(null);
setTrust(30);
}

return ( <div className="min-h-screen bg-[#0B0F1A] text-white px-6 py-10">

```
  {/* HERO */}
  <div className="text-center mb-12">
    <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
      Aqoryn
    </h1>
    <p className="text-gray-400 mt-3">
      Trust infrastructure for freelance payments
    </p>
  </div>

  {/* FLOW VISUAL */}
  <div className="mb-10">
    <FlowVisualizer step={active} />
  </div>

  {/* BUTTONS */}
  <div className="flex gap-4 justify-center mb-10">
    <button
      onClick={runAll}
      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-green-400 text-black rounded-xl font-semibold hover:scale-105 transition"
    >
      Run Demo
    </button>

    <button
      onClick={reset}
      className="px-6 py-3 border border-white/20 rounded-xl hover:border-white/40 transition"
    >
      Reset
    </button>
  </div>

  {/* TRUST SCORE */}
  <div className="flex justify-center mb-10">
    <motion.div
      className="w-32 h-32 rounded-full border-4 border-green-400 flex items-center justify-center"
      animate={{ rotate: trust * 3.6 }}
    >
      <span className="text-xl font-bold">{trust}%</span>
    </motion.div>
  </div>

  {/* TIMELINE */}
  <div className="max-w-2xl mx-auto space-y-3">
    {steps.map((step, i) => {
      const isDone = completed.includes(step.id);
      const color = COLORS[step.color || "gray"] || COLORS.gray;

      return (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${color.border} ${color.bg} hover:scale-[1.02] transition`}
        >
          <div className="font-semibold">{step.label}</div>
          <div className="text-xs text-gray-400">{step.sub}</div>
          {isDone && <div className="text-xs mt-2 text-green-400">✔ Completed</div>}
        </motion.div>
      );
    })}
  </div>
</div>
```

);
}
