// IPFS upload via Web3.Storage (free tier, no API key required for < 5GB)
// Swap NFT_STORAGE_TOKEN in .env.local

const IPFS_GATEWAY = "https://nftstorage.link/ipfs";

export interface ScopeDocument {
  version:      "1.0";
  jobId:        string;
  title:        string;
  description:  string;
  deliverables: DeliverableItem[];
  deadline:     string;  // ISO date
  amount:       number;
  currency:     "USDC";
  createdAt:    string;
}

export interface DeliverableItem {
  id:          string;
  title:       string;
  description: string;
  format?:     string;  // "PDF", "GitHub repo", "Figma link", etc.
}

export interface ProofPackage {
  version:      "1.0";
  jobId:        string;
  freelancer:   string;  // wallet address
  deliverables: ProofDeliverable[];
  notes:        string;
  submittedAt:  string;
}

export interface ProofDeliverable {
  deliverableId: string;
  title:         string;
  type:          "file" | "link" | "text" | "commit";
  content:       string;   // URL, text, or CID
  fileName?:     string;
}

// ─── Upload scope document ───────────────────────────────────────────────────
export async function uploadScopeToIPFS(scope: ScopeDocument): Promise<string> {
  const blob = new Blob([JSON.stringify(scope, null, 2)], {
    type: "application/json",
  });

  const formData = new FormData();
  formData.append("file", blob, `scope-${scope.jobId}.json`);

  const res = await fetch("https://api.nft.storage/upload", {
    method:  "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN}` },
    body:    formData,
  });

  if (!res.ok) throw new Error(`IPFS upload failed: ${res.statusText}`);

  const data = await res.json();
  return data.value.cid as string;
}

// ─── Upload proof package + files ───────────────────────────────────────────
export async function uploadProofToIPFS(
  proof: ProofPackage,
  files: File[]
): Promise<string> {
  const formData = new FormData();

  // Append metadata JSON
  const metaBlob = new Blob([JSON.stringify(proof, null, 2)], {
    type: "application/json",
  });
  formData.append("file", metaBlob, "proof.json");

  // Append each uploaded file
  for (const file of files) {
    formData.append("file", file, file.name);
  }

  const res = await fetch("https://api.nft.storage/upload", {
    method:  "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN}` },
    body:    formData,
  });

  if (!res.ok) throw new Error(`IPFS proof upload failed: ${res.statusText}`);

  const data = await res.json();
  return data.value.cid as string;
}

// ─── Fetch from IPFS ─────────────────────────────────────────────────────────
export async function fetchFromIPFS<T>(cid: string): Promise<T> {
  const url = `${IPFS_GATEWAY}/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed for ${cid}`);
  return res.json() as Promise<T>;
}

export function ipfsUrl(cid: string, filename?: string): string {
  return `${IPFS_GATEWAY}/${cid}${filename ? `/${filename}` : ""}`;
}
