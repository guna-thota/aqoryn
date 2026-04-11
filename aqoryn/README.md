# Aqoryn — Trustless Freelance Payment Protocol on Solana

> Built for [Solana Frontier Hackathon](https://arena.colosseum.org/frontier) · $250K pre-seed · [Live Demo →](https://guna-thota.github.io/aqoryn/demo)

**"We don't trust clients. We don't trust freelancers. We trust code."**

---

## The problem

71% of freelancers have been ghosted on payment at least once.
The current system relies on trust, platform enforcement, and slow dispute resolution — all of which fail.

**Aqoryn is a programmable trust layer for freelance payments.**

---

## How it works

```
Client locks USDC  →  Freelancer delivers  →  AI verifies  →  Auto-release (48h)  →  NFT minted
```

| Step | What happens |
|---|---|
| **Lock** | Client deposits USDC into Solana escrow smart contract — cannot withdraw unilaterally |
| **Deliver** | Freelancer submits proof package (links, files, commits) uploaded to IPFS |
| **Verify** | AI agent runs deterministic checks (GitHub exists, URLs respond) + semantic verification |
| **Release** | Client approves OR stays silent 48h → funds auto-release. AI confidence must be ≥ 75% |
| **Dispute** | Client can raise dispute within 48h. AQRN-staked jurors vote. Minority voters slashed 20% |
| **Reputation** | Soul-bound NFT minted to freelancer's wallet — portable, permanent, unownable by any platform |

---

## What changed in v2 (based on expert review)

### Smart contracts
- **`client_acknowledged`** — client must acknowledge job to prevent blind auto-release
- **Auto-release conditions** — now requires: 48h elapsed + proof submitted + AI confidence ≥ 75%
- **Milestone-based escrow** — up to 10 milestones, amounts validated on-chain
- **Juror staking + slashing** — jurors stake AQRN, minority voters lose 20% (economic security)
- **Full event log** — `JobCreated`, `ProofSubmitted`, `FundsReleased`, `DisputeRaised`, `CaseSettled`, `StakeClaimed`

### AI agent
- **Deterministic pre-checks** (before AI): GitHub repo existence, URL reachability, deliverable ID coverage, deadline check
- **GitHub API integration** — verifies repo exists, has commits, is not empty
- **Confidence gating** — confidence < 75% → `investigate`, < 60% → `dispute`
- **Blended scoring** — 40% deterministic + 60% AI semantic = final confidence
- **`confidenceBps`** — stored as integer basis points (0–10000) for on-chain use
- **Dispute evidence brief** — structured arbitration doc for jurors

### Frontend
- **Interactive demo** (`/demo`) — guided simulation, no wallet required, judges can run it in 2 minutes
- **Status timeline UI** — clickable steps with on-chain tx links and IPFS links
- **Trust layer panel** — shows AI confidence %, deterministic check results, report hash
- **Comparison table** — Aqoryn vs Upwork vs Fiverr

### Testing
- Edge cases: job ID mismatch, empty proof, late submission, missing deliverable IDs, double submission
- Confidence gating assertions
- All mocked — no API key needed to run

---

## GitHub Pages — runs entirely on GitHub

```
Push to main → CI runs tests → builds Next.js static export → deploys to GitHub Pages
```

**Setup (one time):**
1. Fork / clone this repo
2. Go to repo Settings → Pages → Source: **GitHub Actions**
3. Push to `main` — the workflow handles everything

**Live demo URL:** `https://{your-username}.github.io/aqoryn/demo`

No server required. The demo page is fully client-side with simulated on-chain interactions.

---

## Local development

### Prerequisites
- Node.js 18+
- Rust + Anchor CLI (for smart contracts)
- Solana CLI + Phantom wallet

### Setup

```bash
git clone https://github.com/guna-thota/aqoryn
cd aqoryn

# Frontend
cd frontend && npm install
cp .env.local.example .env.local
# Add your NFT_STORAGE_TOKEN
npm run dev  # → http://localhost:3000

# AI Agent (separate terminal)
cd ai-agent && npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY
npm run dev  # → http://localhost:3001

# Smart contracts
cd smart-contracts
anchor build
anchor test --provider.cluster localnet
anchor deploy --provider.cluster devnet
```

---

## Fee comparison

| Platform | Fee on $500 job |
|---|---|
| Upwork | $100 (20%) |
| Fiverr | $100 (20%) |
| Toptal | $100 (20%) |
| **Aqoryn** | **$2.50 (0.5%)** |

---

## Smart contract design

### aqoryn-escrow (state machine)
```
Locked → Delivered → Released
              ↓
           Disputed → Released (freelancer wins)
                    → Refunded (client wins)
```

Auto-release conditions (ALL must be true):
1. 48 hours elapsed since proof submission
2. Proof CID is not empty
3. AI confidence ≥ 75% (7500 bps)
4. No dispute raised

### aqoryn-arbitration (staked DAO)
- Jurors stake AQRN tokens to vote
- 72-hour voting period
- Minimum 3 jurors required
- Minority voters slashed 20% of stake
- Majority voters reclaim full stake

### aqoryn-reputation (soul-bound NFT)
- Minted via Metaplex on job completion
- `max_supply = 0` → non-printable, non-transferable
- Stores: amount, category, delivery time, IPFS proof CID
- Queryable by anyone on-chain

---

## AI verification pipeline

```
Proof submitted
      ↓
Deterministic checks (no AI needed):
  ✓ Job ID match
  ✓ All deliverable IDs covered
  ✓ No empty submissions
  ✓ GitHub repo exists + not empty
  ✓ URLs return HTTP 200
  ✓ Submitted before deadline
      ↓
AI semantic check (Claude):
  - Does proof match scope description?
  - Per-deliverable verdict + reason
  - Overall confidence 0–1
      ↓
Blended score: (deterministic × 0.4) + (AI × 0.6)
      ↓
Gate:
  ≥ 0.85 → "release"
  ≥ 0.60 → "investigate"
   < 0.60 → "dispute"
      ↓
reportHash = SHA-256(full report) → stored on-chain
```

**Important:** AI cannot release funds. It generates verifiable evidence only.

---

## Running tests

```bash
# AI agent tests (no API key needed — all mocked)
cd ai-agent && npm test

# With coverage
npm test -- --coverage
```

Test coverage includes:
- Happy path: complete verified proof
- Job ID mismatch
- Empty proof content
- Late submission
- Missing deliverable IDs
- Partial proof (subset of deliverables)
- Confidence gating assertions
- Double submission behavior
- Dispute evidence generation

---

## Deployment

```
Frontend → GitHub Pages (free, automatic via CI)
AI Agent → Railway / Render / Fly.io (free tier)
Contracts → Solana devnet (anchor deploy)
```

Mainnet requires security audit before deployment.

---

## Roadmap

- [x] Core escrow: lock, release, auto-release, dispute
- [x] Client acknowledgement (prevents blind auto-release)
- [x] Milestone-based escrow (up to 10 milestones)
- [x] Staked DAO arbitration with slashing
- [x] Soul-bound proof-of-work NFT
- [x] AI verification with deterministic pre-checks
- [x] GitHub API integration
- [x] Interactive demo (no wallet required)
- [x] GitHub Pages deployment
- [ ] AQRN governance token
- [ ] Fiat on-ramp (MoonPay)
- [ ] Mobile app
- [ ] Mainnet security audit (OtterSec / Sec3)

---

## Built with

Solana · Anchor · Metaplex · Claude (Anthropic) · Next.js 14 · IPFS/NFT.Storage · Phantom Wallet

---

MIT · [linkedin.com/in/guna-thota](https://linkedin.com/in/guna-thota) · [github.com/guna-thota/aqoryn](https://github.com/guna-thota/aqoryn)
