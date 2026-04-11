export interface ScopeDocument {
  version: "1.0"; jobId: string; title: string; description: string;
  deliverables: DeliverableItem[]; deadline: string;
  amount: number; currency: "USDC"; createdAt: string;
}
export interface DeliverableItem {
  id: string; title: string; description: string; format?: string;
}
export interface ProofPackage {
  version: "1.0"; jobId: string; freelancer: string;
  deliverables: ProofDeliverable[]; notes: string; submittedAt: string;
}
export interface ProofDeliverable {
  deliverableId: string; title: string;
  type: "file" | "link" | "text" | "commit"; content: string; fileName?: string;
}
export async function uploadScopeToIPFS(_scope: ScopeDocument): Promise<string> {
  return "QmDemoScopeCID123456789";
}
export async function uploadProofToIPFS(_proof: ProofPackage, _files: File[]): Promise<string> {
  return "QmDemoProofCID123456789";
}