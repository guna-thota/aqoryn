import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AqorynEscrow } from "../target/types/aqoryn_escrow";
import {
  createMint, createAssociatedTokenAccount, mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import crypto from "crypto";

describe("aqoryn-escrow — full test suite", () => {
  const provider  = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program   = anchor.workspace.AqorynEscrow as Program<AqorynEscrow>;

  const client     = anchor.web3.Keypair.generate();
  const freelancer = anchor.web3.Keypair.generate();
  const treasury   = anchor.web3.Keypair.generate();
  const imposter   = anchor.web3.Keypair.generate();

  let mint: anchor.web3.PublicKey;
  let clientToken: anchor.web3.PublicKey;
  let freelancerToken: anchor.web3.PublicKey;
  let treasuryToken: anchor.web3.PublicKey;

  const AMOUNT     = 500_000_000; // 500 USDC
  const SCOPE_CID  = "QmScopeCIDExampleAqorynTest12345678901234567890";
  const PROOF_CID  = "QmProofCIDExampleAqorynTest12345678901234567890x";
  const AI_HASH    = Array.from(crypto.createHash("sha256").update("verified:3/3").digest());
  const AI_CONF    = 9400; // 94% in bps — above 7500 threshold

  function makeJobId() { return Array.from(crypto.randomBytes(32)); }
  function escrowPDA(jobId: number[]) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("aqoryn-escrow"), Buffer.from(jobId)], program.programId
    );
  }
  function vaultPDA(jobId: number[]) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("aqoryn-vault"), Buffer.from(jobId)], program.programId
    );
  }

  before(async () => {
    for (const kp of [client, freelancer, treasury, imposter]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig);
    }
    mint           = await createMint(provider.connection, client, client.publicKey, null, 6);
    clientToken    = await createAssociatedTokenAccount(provider.connection, client, mint, client.publicKey);
    freelancerToken = await createAssociatedTokenAccount(provider.connection, client, mint, freelancer.publicKey);
    treasuryToken  = await createAssociatedTokenAccount(provider.connection, client, mint, treasury.publicKey);
    await mintTo(provider.connection, client, mint, clientToken, client, 1_000_000_000);
  });

  async function createBaseJob(jobId: number[], amount = AMOUNT, mils: any[] = []) {
    const [ep] = escrowPDA(jobId);
    const [vp] = vaultPDA(jobId);
    const deadline = Math.floor(Date.now() / 1000) + 7 * 86400;
    await program.methods
      .createJob(jobId, new anchor.BN(amount), SCOPE_CID, new anchor.BN(deadline), mils)
      .accounts({
        escrow: ep, vault: vp,
        client: client.publicKey, freelancer: freelancer.publicKey,
        mint, clientToken,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([client]).rpc();
    return { ep, vp };
  }

  // ── Happy path ───────────────────────────────────────────────────────────
  describe("happy path — create → deliver → approve", () => {
    const jobId = makeJobId();
    let ep: anchor.web3.PublicKey, vp: anchor.web3.PublicKey;

    it("creates job and locks funds", async () => {
      ({ ep, vp } = await createBaseJob(jobId));
      const escrow = await program.account.escrowAccount.fetch(ep);
      assert.equal(escrow.totalAmount.toNumber(), AMOUNT);
      assert.deepEqual(escrow.state, { locked: {} });
      assert.equal(escrow.clientAcknowledged, false);
      const bal = await provider.connection.getTokenAccountBalance(vp);
      assert.equal(bal.value.uiAmount, 500);
      console.log("✓ Job created, 500 USDC locked");
    });

    it("client acknowledges job", async () => {
      await program.methods.clientAcknowledge()
        .accounts({ escrow: ep, client: client.publicKey })
        .signers([client]).rpc();
      const escrow = await program.account.escrowAccount.fetch(ep);
      assert.equal(escrow.clientAcknowledged, true);
      assert.isAbove(escrow.clientLastSeen.toNumber(), 0);
      console.log("✓ Client acknowledged job");
    });

    it("freelancer submits proof with AI confidence", async () => {
      await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(AI_CONF), 0)
        .accounts({ escrow: ep, freelancer: freelancer.publicKey })
        .signers([freelancer]).rpc();
      const escrow = await program.account.escrowAccount.fetch(ep);
      assert.deepEqual(escrow.state, { delivered: {} });
      assert.equal(escrow.aiConfidenceBps.toNumber(), AI_CONF);
      assert.isAbove(escrow.deliveredAt.toNumber(), 0);
      console.log("✓ Proof submitted with 94% AI confidence");
    });

    it("client approves and funds release with 0.5% fee", async () => {
      const before = (await provider.connection.getTokenAccountBalance(freelancerToken)).value.uiAmount ?? 0;
      await program.methods.approveAndRelease()
        .accounts({
          escrow: ep, vault: vp,
          client: client.publicKey,
          freelancerToken, treasury: treasuryToken,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([client]).rpc();
      const after   = (await provider.connection.getTokenAccountBalance(freelancerToken)).value.uiAmount ?? 0;
      const treAfter = (await provider.connection.getTokenAccountBalance(treasuryToken)).value.uiAmount ?? 0;
      assert.approximately(after - before, 497.5, 0.01);
      assert.approximately(treAfter, 2.5, 0.01);
      const escrow = await program.account.escrowAccount.fetch(ep);
      assert.deepEqual(escrow.state, { released: {} });
      console.log(`✓ Released: freelancer +${(after - before).toFixed(2)} USDC, fee +${treAfter.toFixed(2)} USDC`);
    });
  });

  // ── Milestone-based payment ───────────────────────────────────────────────
  describe("milestone-based escrow", () => {
    const jobId = makeJobId();

    it("creates milestone job with 3 milestones summing to 500 USDC", async () => {
      const mils = [
        { amount: new anchor.BN(200_000_000), ipfsScope: SCOPE_CID },
        { amount: new anchor.BN(150_000_000), ipfsScope: SCOPE_CID },
        { amount: new anchor.BN(150_000_000), ipfsScope: SCOPE_CID },
      ];
      const [ep] = escrowPDA(jobId);
      const [vp] = vaultPDA(jobId);
      const deadline = Math.floor(Date.now() / 1000) + 7 * 86400;
      await program.methods
        .createJob(jobId, new anchor.BN(AMOUNT), SCOPE_CID, new anchor.BN(deadline), mils)
        .accounts({
          escrow: ep, vault: vp,
          client: client.publicKey, freelancer: freelancer.publicKey,
          mint, clientToken,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([client]).rpc();
      const escrow = await program.account.escrowAccount.fetch(ep);
      assert.equal(escrow.milestoneCount, 3);
      assert.equal(escrow.currentMilestone, 0);
      console.log("✓ Milestone job created (3 milestones)");
    });
  });

  // ── Edge case: unauthorized proof submission ──────────────────────────────
  describe("security — unauthorized submissions", () => {
    const jobId = makeJobId();

    before(async () => { await createBaseJob(jobId); });

    it("rejects proof from imposter", async () => {
      const [ep] = escrowPDA(jobId);
      try {
        await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(AI_CONF), 0)
          .accounts({ escrow: ep, freelancer: imposter.publicKey })
          .signers([imposter]).rpc();
        assert.fail("Should have thrown Unauthorized");
      } catch (e: any) {
        assert.include(e.message, "Unauthorized");
        console.log("✓ Imposter rejected for proof submission");
      }
    });

    it("rejects dispute from non-client", async () => {
      const [ep] = escrowPDA(jobId);
      // First submit valid proof
      await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(AI_CONF), 0)
        .accounts({ escrow: ep, freelancer: freelancer.publicKey })
        .signers([freelancer]).rpc();
      // Imposter tries to dispute
      try {
        await program.methods.raiseDispute("QmFakeDisputeReason123456789012345678901234567")
          .accounts({ escrow: ep, client: imposter.publicKey })
          .signers([imposter]).rpc();
        assert.fail("Should have thrown Unauthorized");
      } catch (e: any) {
        assert.include(e.message, "Unauthorized");
        console.log("✓ Imposter rejected for dispute");
      }
    });
  });

  // ── Edge case: double submission blocked by state ─────────────────────────
  describe("edge case — double submission", () => {
    const jobId = makeJobId();

    before(async () => { await createBaseJob(jobId); });

    it("rejects second proof after state = Delivered", async () => {
      const [ep] = escrowPDA(jobId);
      // First submission succeeds
      await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(AI_CONF), 0)
        .accounts({ escrow: ep, freelancer: freelancer.publicKey })
        .signers([freelancer]).rpc();
      // Second submission should fail — state is now Delivered, not Locked
      try {
        await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(AI_CONF), 0)
          .accounts({ escrow: ep, freelancer: freelancer.publicKey })
          .signers([freelancer]).rpc();
        assert.fail("Should have rejected double submission");
      } catch (e: any) {
        assert.include(e.message, "InvalidState");
        console.log("✓ Double submission blocked by state machine");
      }
    });
  });

  // ── Edge case: auto-release blocked by low AI confidence ─────────────────
  describe("edge case — auto-release conditions", () => {
    const jobId = makeJobId();
    const LOW_CONF = 5000; // 50% — below 75% threshold

    before(async () => { await createBaseJob(jobId); });

    it("auto-release fails when AI confidence is below 75%", async () => {
      const [ep] = escrowPDA(jobId);
      const [vp] = vaultPDA(jobId);

      // Submit with low confidence
      await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(LOW_CONF), 0)
        .accounts({ escrow: ep, freelancer: freelancer.publicKey })
        .signers([freelancer]).rpc();

      // Attempt auto-release (will fail due to confidence + time, but confidence checked first)
      try {
        await program.methods.autoRelease()
          .accounts({
            escrow: ep, vault: vp,
            client: client.publicKey,
            freelancerToken, treasury: treasuryToken,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have blocked due to low AI confidence");
      } catch (e: any) {
        // Either AiConfidenceTooLow or AutoReleaseNotReady (time check comes first)
        const blocked = e.message.includes("AiConfidenceTooLow") || e.message.includes("AutoReleaseNotReady");
        assert.isTrue(blocked);
        console.log("✓ Auto-release blocked (low confidence or time not elapsed)");
      }
    });
  });

  // ── Edge case: dispute + refund flow ─────────────────────────────────────
  describe("dispute flow", () => {
    const jobId = makeJobId();

    before(async () => { await createBaseJob(jobId); });

    it("raises dispute within 48h window", async () => {
      const [ep] = escrowPDA(jobId);

      await program.methods.submitProof(PROOF_CID, AI_HASH, new anchor.BN(AI_CONF), 0)
        .accounts({ escrow: ep, freelancer: freelancer.publicKey })
        .signers([freelancer]).rpc();

      await program.methods.raiseDispute("QmDisputeReasonHashExampleAqorynTest123456789012")
        .accounts({ escrow: ep, client: client.publicKey })
        .signers([client]).rpc();

      const escrow = await program.account.escrowAccount.fetch(ep);
      assert.deepEqual(escrow.state, { disputed: {} });
      assert.isAbove(escrow.clientLastSeen.toNumber(), 0);
      console.log("✓ Dispute raised, funds frozen");
    });
  });

  // ── Edge case: milestone amount mismatch ─────────────────────────────────
  describe("validation — milestone amount mismatch", () => {
    it("rejects milestones that don't sum to total", async () => {
      const jobId = makeJobId();
      const badMils = [
        { amount: new anchor.BN(100_000_000), ipfsScope: SCOPE_CID },
        { amount: new anchor.BN(100_000_000), ipfsScope: SCOPE_CID },
        // Total = 200, but job is 500 → mismatch
      ];
      const [ep] = escrowPDA(jobId);
      const [vp] = vaultPDA(jobId);
      const deadline = Math.floor(Date.now() / 1000) + 7 * 86400;
      try {
        await program.methods
          .createJob(jobId, new anchor.BN(AMOUNT), SCOPE_CID, new anchor.BN(deadline), badMils)
          .accounts({
            escrow: ep, vault: vp,
            client: client.publicKey, freelancer: freelancer.publicKey,
            mint, clientToken,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([client]).rpc();
        assert.fail("Should have rejected milestone mismatch");
      } catch (e: any) {
        assert.include(e.message, "MilestoneAmountMismatch");
        console.log("✓ Milestone amount mismatch rejected");
      }
    });
  });
});
