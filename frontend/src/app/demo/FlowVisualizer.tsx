"use client";

import { motion } from "framer-motion";

export default function FlowVisualizer({ step }: { step: string | null }) {
const nodes = ["client", "escrow", "ai", "release"];

return ( <div className="relative flex justify-between items-center bg-[#0B0F1A] border border-white/10 rounded-xl px-6 py-6">

  {/* line */}
  <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-green-400 to-purple-500 opacity-30" />

  {nodes.map((n) => (
    <motion.div
      key={n}
      className="z-10 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs"
      animate={{
        scale: step === n ? 1.2 : 1,
        boxShadow: step === n ? "0 0 20px #14F195" : "none"
      }}
    >
      {n.toUpperCase()}
    </motion.div>
  ))}

  {/* moving dot */}
  <motion.div
    className="absolute w-3 h-3 bg-green-400 rounded-full"
    animate={{ x: ["0%", "100%"] }}
    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
  />
</div>


);
}
