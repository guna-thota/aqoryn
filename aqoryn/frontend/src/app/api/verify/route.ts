import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const AI_AGENT_URL = process.env.AI_AGENT_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, proofCid, scopeCid } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // If CIDs provided, fetch from IPFS and verify
    if (scopeCid && proofCid) {
      const res = await fetch(`${AI_AGENT_URL}/verify-by-cid`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scopeCid, proofCid }),
      });

      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json({ error: err.message ?? "AI verification failed" }, { status: 500 });
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    // If full scope + proof objects provided directly
    if (body.scope && body.proof) {
      const res = await fetch(`${AI_AGENT_URL}/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scope: body.scope, proof: body.proof }),
      });

      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json({ error: err.message ?? "AI verification failed" }, { status: 500 });
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Provide either (scopeCid + proofCid) or (scope + proof)" }, { status: 400 });

  } catch (err: any) {
    console.error("Verify API error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
