import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Connection } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import {
  ESCROW_PROGRAM_ID,
  ESCROW_SEED,
  VAULT_SEED,
  USDC_MINT_DEVNET,
  TREASURY_WALLET,
  PROTOCOL_FEE_BPS,
  type Job,
} from "./constants";

// ─── Derive PDAs ─────────────────────────────────────────────────────────────
export function deriveEscrowPDA(jobIdBytes: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_SEED), jobIdBytes],
    ESCROW_PROGRAM_ID
  );
}

export function deriveVaultPDA(jobIdBytes: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), jobIdBytes],
    ESCROW_PROGRAM_ID
  );
}

// ─── UUID ↔ bytes ────────────────────────────────────────────────────────────
export function uuidToBytes(uuid: string): number[] {
  return Array.from(Buffer.from(uuid.replace(/-/g, ""), "hex"));
}

export function bytesToUuid(bytes: number[]): string {
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ─── Create Job ──────────────────────────────────────────────────────────────
export async function createJob(
  program:    Program,
  provider:   AnchorProvider,
  params: {
    freelancerWallet: PublicKey;
    amountUsdc:       number;   // human readable e.g. 500
    ipfsScopeCid:     string;
    deadlineDate:     Date;
    title:            string;
  }
): Promise<{ jobId: string; txSignature: string }> {
  const jobId    = uuidv4();
  const jobIdBuf = Buffer.from(jobId.replace(/-/g, ""), "hex");
  const jobIdArr = Array.from(jobIdBuf);

  const [escrowPDA] = deriveEscrowPDA(jobIdBuf);
  const [vaultPDA]  = deriveVaultPDA(jobIdBuf);

  const client = provider.wallet.publicKey;
  const mint   = USDC_MINT_DEVNET;

  const clientToken = await getAssociatedTokenAddress(mint, client);
  const deadline    = Math.floor(params.deadlineDate.getTime() / 1000);
  const amountLamport = params.amountUsdc * 1_000_000; // USDC has 6 decimals

  const tx = await program.methods
    .createJob(
      jobIdArr,
      new BN(amountLamport),
      params.ipfsScopeCid,
      new BN(deadline)
    )
    .accounts({
      escrow:        escrowPDA,
      vault:         vaultPDA,
      client,
      freelancer:    params.freelancerWallet,
      mint,
      clientToken,
      tokenProgram:  TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent:          SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return { jobId, txSignature: tx };
}

// ─── Submit Proof ────────────────────────────────────────────────────────────
export async function submitProof(
  program:  Program,
  provider: AnchorProvider,
  params: {
    jobId:          string;
    ipfsProofCid:   string;
    aiReportHash:   string; // hex string of SHA-256
  }
): Promise<string> {
  const jobIdBuf   = Buffer.from(params.jobId.replace(/-/g, ""), "hex");
  const jobIdArr   = Array.from(jobIdBuf);
  const [escrowPDA] = deriveEscrowPDA(jobIdBuf);
  const hashBytes  = Array.from(Buffer.from(params.aiReportHash, "hex"));

  const tx = await program.methods
    .submitProof(params.ipfsProofCid, hashBytes)
    .accounts({
      escrow:     escrowPDA,
      freelancer: provider.wallet.publicKey,
    })
    .rpc();

  return tx;
}

// ─── Approve Release ─────────────────────────────────────────────────────────
export async function approveRelease(
  program:    Program,
  provider:   AnchorProvider,
  jobId:      string,
  freelancer: PublicKey
): Promise<string> {
  const jobIdBuf        = Buffer.from(jobId.replace(/-/g, ""), "hex");
  const [escrowPDA]     = deriveEscrowPDA(jobIdBuf);
  const [vaultPDA]      = deriveVaultPDA(jobIdBuf);
  const mint            = USDC_MINT_DEVNET;
  const freelancerToken = await getAssociatedTokenAddress(mint, freelancer);
  const treasuryToken   = await getAssociatedTokenAddress(mint, TREASURY_WALLET);

  return await program.methods
    .approveAndRelease()
    .accounts({
      escrow:          escrowPDA,
      vault:           vaultPDA,
      client:          provider.wallet.publicKey,
      freelancerToken,
      treasury:        treasuryToken,
      tokenProgram:    TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// ─── Auto Release ────────────────────────────────────────────────────────────
export async function triggerAutoRelease(
  program:    Program,
  provider:   AnchorProvider,
  jobId:      string,
  freelancer: PublicKey
): Promise<string> {
  const jobIdBuf        = Buffer.from(jobId.replace(/-/g, ""), "hex");
  const [escrowPDA]     = deriveEscrowPDA(jobIdBuf);
  const [vaultPDA]      = deriveVaultPDA(jobIdBuf);
  const mint            = USDC_MINT_DEVNET;
  const freelancerToken = await getAssociatedTokenAddress(mint, freelancer);
  const treasuryToken   = await getAssociatedTokenAddress(mint, TREASURY_WALLET);

  return await program.methods
    .autoRelease()
    .accounts({
      escrow:          escrowPDA,
      vault:           vaultPDA,
      client:          provider.wallet.publicKey,
      freelancerToken,
      treasury:        treasuryToken,
      tokenProgram:    TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// ─── Raise Dispute ───────────────────────────────────────────────────────────
export async function raiseDispute(
  program:      Program,
  provider:     AnchorProvider,
  jobId:        string,
  reasonIpfsCid: string
): Promise<string> {
  const jobIdBuf  = Buffer.from(jobId.replace(/-/g, ""), "hex");
  const [escrowPDA] = deriveEscrowPDA(jobIdBuf);

  return await program.methods
    .raiseDispute(reasonIpfsCid)
    .accounts({
      escrow: escrowPDA,
      client: provider.wallet.publicKey,
    })
    .rpc();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function calculateFee(amountUsdc: number): { fee: number; payout: number } {
  const fee    = (amountUsdc * PROTOCOL_FEE_BPS) / 10_000;
  const payout = amountUsdc - fee;
  return { fee, payout };
}

export function getStateLabel(state: Job["state"]): string {
  const map: Record<string, string> = {
    Locked:    "Funds Locked",
    Delivered: "Awaiting Review",
    Released:  "Paid",
    Disputed:  "In Dispute",
    Refunded:  "Refunded",
  };
  return map[state] ?? state;
}

export function getHoursUntilAutoRelease(deliveredAt: Date): number {
  const elapsed = (Date.now() - deliveredAt.getTime()) / 3_600_000;
  return Math.max(0, 48 - elapsed);
}
