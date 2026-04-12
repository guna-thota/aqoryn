export interface ScopeDocument {
  version: "1.0"; jobId: string; title: string; description: string;
  deliverables: any[]; deadline: string; amount: number; currency: "USDC"; createdAt: string;
}
export interface ProofPackage {
  version: "1.0"; jobId: string; freelancer: string;
  deliverables: any[]; notes: string; submittedAt: string;
}
export type ProofDeliverable = { deliverableId: string; title: string; type: string; content: string; fileName?: string; }
export type DeliverableItem = { id: string; title: string; description: string; format?: string; }
export async function uploadScopeToIPFS(_s: any): Promise<string> { return "QmDemo"; }
export async function uploadProofToIPFS(_p: any, _f: any): Promise<string> { return "QmDemo"; }
