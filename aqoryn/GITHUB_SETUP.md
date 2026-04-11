# Get Aqoryn live on GitHub Pages in 5 minutes

## Step 1 — Fork or push the repo

```bash
# Create repo at github.com/guna-thota/aqoryn then:
git init
git add .
git commit -m "feat: aqoryn v2 — programmable trust layer for freelance payments"
git branch -M main
git remote add origin https://github.com/guna-thota/aqoryn.git
git push -u origin main
```

## Step 2 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Save

That's it. The CI workflow handles the build and deploy automatically.

## Step 3 — Watch the pipeline run

Go to the **Actions** tab. You'll see:

```
✓ AI Agent tests    → runs verifier.test.ts (mocked, no API key)
✓ Frontend build    → Next.js static export
✓ Deploy to Pages   → only on push to main
```

## Step 4 — Your live URLs

After deploy completes (~3 minutes):

| Page | URL |
|---|---|
| Landing | `https://guna-thota.github.io/aqoryn` |
| **Demo (show judges this)** | `https://guna-thota.github.io/aqoryn/demo` |
| Dashboard | `https://guna-thota.github.io/aqoryn/dashboard` |
| Create job | `https://guna-thota.github.io/aqoryn/jobs/create` |

## Optional: Add secrets for real features

If you want GitHub checks + AI verification to work in deployed version,
add these in **Settings → Secrets → Actions**:

| Secret | Value | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Claude API key | AI verification tests (already mocked, this enables real calls) |
| `NEXT_PUBLIC_NFT_STORAGE_TOKEN` | nft.storage token | IPFS uploads in frontend |
| `GITHUB_TOKEN` | Auto-provided by GitHub | GitHub API repo checks in AI agent |

## For the hackathon submission

The demo page at `/demo` is your submission showcase:
- No wallet required
- Step-by-step simulation with on-chain links
- AI trust layer panel
- Comparison table
- Shows the full Priya/Mark story

**Include this link in your submission:** `https://guna-thota.github.io/aqoryn/demo`

## Badges for your README

```markdown
[![CI](https://github.com/guna-thota/aqoryn/actions/workflows/ci.yml/badge.svg)](https://github.com/guna-thota/aqoryn/actions)
[![Demo](https://img.shields.io/badge/demo-live-teal)](https://guna-thota.github.io/aqoryn/demo)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF)](https://explorer.solana.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
```

## Troubleshooting

**Build fails with "Cannot find module"**
→ Make sure `frontend/package-lock.json` exists. Run `cd frontend && npm install` locally first.

**Pages shows 404**
→ Check `basePath` in `next.config.js` matches your repo name exactly.

**Tests fail in CI**
→ The AI agent tests are fully mocked. If they fail, it's a TypeScript error — check the error message in the Actions log.

**Wallet connect doesn't work on Pages**
→ Static export + GitHub Pages works for the demo. Phantom wallet requires a proper RPC connection — use the Vercel deployment for full wallet functionality.
