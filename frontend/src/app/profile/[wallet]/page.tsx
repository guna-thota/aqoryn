import { Award, ExternalLink, Wallet } from "lucide-react";

export function generateStaticParams() {
  return [{ wallet: "FrEeLaNcErWaLLetAdDrEsS1234567890xY" }];
}

const NFTS = [
  { mint: "NFTMint1", title: "React landing page", category: "web-development", amount: 500, deliveredInHours: 28, mintedAt: "2024-06-15" },
  { mint: "NFTMint2", title: "Figma design system", category: "design", amount: 800, deliveredInHours: 42, mintedAt: "2024-05-20" },
];

export default function ProfilePage({ params }: { params: { wallet: string } }) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center"><Wallet className="w-7 h-7 text-teal-400" /></div>
        <div>
          <h1 className="text-xl font-bold font-mono">{params.wallet.slice(0,8)}…{params.wallet.slice(-8)}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">web-development</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">design</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center"><div className="text-3xl font-bold text-teal-400">2</div><div className="text-xs text-gray-500 mt-1">Jobs completed</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center"><div className="text-3xl font-bold">$1,300</div><div className="text-xs text-gray-500 mt-1">Total earned</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center"><div className="text-3xl font-bold">35h</div><div className="text-xs text-gray-500 mt-1">Avg delivery</div></div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-teal-400" /><h2 className="font-semibold">Proof-of-Work NFTs</h2></div>
        <div className="space-y-4">
          {NFTS.map(nft => (
            <div key={nft.mint} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0"><Award className="w-5 h-5 text-teal-400" /></div>
                  <div>
                    <div className="font-medium">{nft.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{nft.category}</span>
                      <span className="text-xs text-teal-500">✓ AI verified</span>
                    </div>
                  </div>
                </div>
                <div className="text-right"><div className="font-semibold text-teal-400">{nft.amount} USDC</div><div className="text-xs text-gray-500 mt-1">Delivered in {nft.deliveredInHours}h</div></div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-600">Minted {nft.mintedAt}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6">
        <h3 className="font-medium text-teal-400 mb-2">Why this reputation is different</h3>
        <p className="text-sm text-gray-400">Every NFT is soul-bound — non-transferable, permanent, unownable by any platform. Any client can verify this on-chain without logging in anywhere.</p>
      </div>
    </div>
  );
}
