import { PublicKey } from "@solana/web3.js";

export const ESCROW_PROGRAM_ID     = new PublicKey("AqRnEsCR0wHeLk4youRFundSo1anaDevn3tTeSt00001");
export const REPUTATION_PROGRAM_ID = new PublicKey("AqRnREP11UTat10nS0uLBoundT0k3nM1ntPr0gram002");
export const ARBITRATION_PROGRAM_ID = new PublicKey("AqRnARB1TRat10nDA0Jury5t4k3S1ash1ngPr0gram003");

// USDC mint on devnet (Circle's official devnet USDC)
export const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
// USDC mint on mainnet
export const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export const ESCROW_SEED     = "aqoryn-escrow";
export const VAULT_SEED      = "aqoryn-vault";
export const REPUTATION_SEED = "aqoryn-rep";
export const ARBITRATION_SEED = "aqoryn-arb";

export const AUTO_RELEASE_HOURS = 48;
export const DISPUTE_WINDOW_HOURS = 48;
export const PROTOCOL_FEE_BPS = 50; // 0.5%

export const TREASURY_WALLET = new PublicKey("AqRnTrEaSuRyWaLLetAqorynProtoCoLFeeRecipient1");

export type EscrowState = "Locked" | "Delivered" | "Released" | "Disputed" | "Refunded";

export interface EscrowAccount {
  jobId:        number[];
  client:       PublicKey;
  freelancer:   PublicKey;
  mint:         PublicKey;
  amount:       bigint;
  ipfsScope:    string;
  deadline:     bigint;
  state:        { locked?: {} } | { delivered?: {} } | { released?: {} } | { disputed?: {} } | { refunded?: {} };
  createdAt:    bigint;
  deliveredAt:  bigint;
  ipfsProof:    string;
  aiReportHash: number[];
  bump:         number;
  vaultBump:    number;
}

export interface Job {
  jobId:        string;
  title:        string;
  description:  string;
  amount:       number;
  client:       string;
  freelancer:   string;
  state:        EscrowState;
  ipfsScope:    string;
  ipfsProof?:   string;
  deadline:     Date;
  createdAt:    Date;
  deliveredAt?: Date;
  aiVerified?:  boolean;
  aiReport?:    AIVerificationReport;
}

export interface AIVerificationReport {
  jobId:              string;
  deliverableCount:   number;
  verifiedCount:      number;
  missingItems:       string[];
  confidence:         number;  // 0-1
  summary:            string;
  reportHash:         string;  // SHA-256 hex
  generatedAt:        string;
}
