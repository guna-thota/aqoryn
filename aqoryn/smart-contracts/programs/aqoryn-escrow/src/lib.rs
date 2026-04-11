use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("AqRnEsCR0wHeLk4youRFundSo1anaDevn3tTeSt00001");

pub const ESCROW_SEED: &[u8]         = b"aqoryn-escrow";
pub const VAULT_SEED: &[u8]          = b"aqoryn-vault";
pub const AUTO_RELEASE_SECS: i64     = 48 * 60 * 60;
pub const DISPUTE_WINDOW_SECS: i64   = 48 * 60 * 60;
pub const PROTOCOL_FEE_BPS: u64      = 50;
pub const MIN_AI_CONFIDENCE_BPS: u64 = 7500; // 0.75 threshold
pub const MAX_MILESTONES: usize      = 10;

#[program]
pub mod aqoryn_escrow {
    use super::*;

    /// Create a job and lock USDC. Supports single-payment or milestone-based.
    pub fn create_job(
        ctx:        Context<CreateJob>,
        job_id:     [u8; 32],
        total_usdc: u64,
        ipfs_scope: String,
        deadline:   i64,
        milestones: Vec<MilestoneInput>,
    ) -> Result<()> {
        require!(total_usdc > 0, AqorynError::ZeroAmount);
        require!(ipfs_scope.len() <= 64, AqorynError::ScopeTooLong);
        require!(milestones.len() <= MAX_MILESTONES, AqorynError::TooManyMilestones);

        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, AqorynError::DeadlineInPast);

        if !milestones.is_empty() {
            let sum: u64 = milestones.iter().map(|m| m.amount).sum();
            require!(sum == total_usdc, AqorynError::MilestoneAmountMismatch);
        }

        let escrow = &mut ctx.accounts.escrow;
        escrow.job_id              = job_id;
        escrow.client              = ctx.accounts.client.key();
        escrow.freelancer          = ctx.accounts.freelancer.key();
        escrow.mint                = ctx.accounts.mint.key();
        escrow.total_amount        = total_usdc;
        escrow.released_amount     = 0;
        escrow.ipfs_scope          = ipfs_scope.clone();
        escrow.deadline            = deadline;
        escrow.state               = EscrowState::Locked;
        escrow.created_at          = clock.unix_timestamp;
        escrow.delivered_at        = 0;
        escrow.client_last_seen    = clock.unix_timestamp;
        escrow.client_acknowledged = false;
        escrow.ipfs_proof          = String::new();
        escrow.ai_confidence_bps   = 0;
        escrow.ai_report_hash      = [0u8; 32];
        escrow.milestone_count     = milestones.len() as u8;
        escrow.current_milestone   = 0;
        escrow.bump                = ctx.bumps.escrow;
        escrow.vault_bump          = ctx.bumps.vault;

        for (i, m) in milestones.iter().enumerate() {
            let mut scope_bytes = [0u8; 64];
            let b = m.ipfs_scope.as_bytes();
            scope_bytes[..b.len().min(64)].copy_from_slice(&b[..b.len().min(64)]);
            escrow.milestones[i] = MilestoneRecord {
                amount:     m.amount,
                ipfs_scope: scope_bytes,
                completed:  false,
            };
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.client_token.to_account_info(),
                    to:        ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.client.to_account_info(),
                },
            ),
            total_usdc,
        )?;

        emit!(JobCreated {
            job_id, client: escrow.client, freelancer: escrow.freelancer,
            amount: total_usdc, ipfs_scope, deadline,
            milestone_count: escrow.milestone_count,
        });
        Ok(())
    }

    /// Client acknowledges they have seen the job — prevents blind auto-release.
    pub fn client_acknowledge(ctx: Context<ClientAction>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(ctx.accounts.client.key() == escrow.client, AqorynError::Unauthorized);
        let clock = Clock::get()?;
        escrow.client_last_seen    = clock.unix_timestamp;
        escrow.client_acknowledged = true;
        emit!(ClientAcknowledged { job_id: escrow.job_id, client: escrow.client, timestamp: clock.unix_timestamp });
        Ok(())
    }

    /// Freelancer submits proof + AI verification result hash.
    pub fn submit_proof(
        ctx:               Context<SubmitProof>,
        ipfs_proof:        String,
        ai_report_hash:    [u8; 32],
        ai_confidence_bps: u64,
        milestone_index:   u8,
    ) -> Result<()> {
        require!(ipfs_proof.len() <= 64, AqorynError::ProofCIDTooLong);
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Locked, AqorynError::InvalidState);
        require!(ctx.accounts.freelancer.key() == escrow.freelancer, AqorynError::Unauthorized);
        if escrow.milestone_count > 0 {
            require!(milestone_index == escrow.current_milestone, AqorynError::InvalidMilestoneIndex);
        }
        let clock = Clock::get()?;
        escrow.state             = EscrowState::Delivered;
        escrow.delivered_at      = clock.unix_timestamp;
        escrow.ipfs_proof        = ipfs_proof.clone();
        escrow.ai_report_hash    = ai_report_hash;
        escrow.ai_confidence_bps = ai_confidence_bps;
        emit!(ProofSubmitted {
            job_id: escrow.job_id, freelancer: escrow.freelancer, ipfs_proof,
            ai_report_hash, ai_confidence_bps, milestone_index, delivered_at: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Client explicitly approves and releases funds.
    pub fn approve_and_release(ctx: Context<ReleaseFunds>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Delivered, AqorynError::InvalidState);
        require!(ctx.accounts.client.key() == escrow.client, AqorynError::Unauthorized);
        let amount = if escrow.milestone_count == 0 { escrow.total_amount }
                     else { escrow.milestones[escrow.current_milestone as usize].amount };
        release_funds(&ctx, amount, ReleaseTrigger::ClientApproval)
    }

    /// Auto-release after 48h — only if proof exists AND AI confidence >= 0.75.
    pub fn auto_release(ctx: Context<ReleaseFunds>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Delivered, AqorynError::InvalidState);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= escrow.delivered_at + AUTO_RELEASE_SECS, AqorynError::AutoReleaseNotReady);
        require!(!escrow.ipfs_proof.is_empty(), AqorynError::NoProofSubmitted);
        require!(escrow.ai_confidence_bps >= MIN_AI_CONFIDENCE_BPS, AqorynError::AiConfidenceTooLow);
        let amount = if escrow.milestone_count == 0 { escrow.total_amount }
                     else { escrow.milestones[escrow.current_milestone as usize].amount };
        release_funds(&ctx, amount, ReleaseTrigger::AutoRelease)
    }

    /// Client raises dispute within 48h window.
    pub fn raise_dispute(ctx: Context<RaiseDispute>, reason_ipfs: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Delivered, AqorynError::InvalidState);
        require!(ctx.accounts.client.key() == escrow.client, AqorynError::Unauthorized);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < escrow.delivered_at + DISPUTE_WINDOW_SECS, AqorynError::DisputeWindowClosed);
        escrow.client_last_seen = clock.unix_timestamp;
        escrow.state = EscrowState::Disputed;
        emit!(DisputeRaised {
            job_id: escrow.job_id, client: escrow.client, freelancer: escrow.freelancer,
            reason_ipfs, ai_confidence_bps: escrow.ai_confidence_bps, raised_at: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Arbitration program resolves dispute and pays winner.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, freelancer_wins: bool) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Disputed, AqorynError::InvalidState);
        let remaining = escrow.total_amount - escrow.released_amount;
        let fee    = remaining.checked_mul(PROTOCOL_FEE_BPS).unwrap() / 10_000;
        let payout = remaining - fee;
        let seeds: &[&[&[u8]]] = &[&[VAULT_SEED, &[escrow.vault_bump]]];

        if freelancer_wins {
            token::transfer(CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.freelancer_token.to_account_info(), authority: ctx.accounts.vault.to_account_info() },
                seeds,
            ), payout)?;
            escrow.state = EscrowState::Released;
        } else {
            token::transfer(CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.client_token.to_account_info(), authority: ctx.accounts.vault.to_account_info() },
                seeds,
            ), remaining)?;
            escrow.state = EscrowState::Refunded;
        }
        if fee > 0 && freelancer_wins {
            token::transfer(CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.treasury.to_account_info(), authority: ctx.accounts.vault.to_account_info() },
                seeds,
            ), fee)?;
        }
        emit!(DisputeResolved { job_id: escrow.job_id, freelancer_wins, amount: remaining });
        Ok(())
    }
}

fn release_funds<'info>(ctx: &Context<ReleaseFunds<'info>>, amount: u64, trigger: ReleaseTrigger) -> Result<()> {
    let fee    = amount.checked_mul(PROTOCOL_FEE_BPS).unwrap() / 10_000;
    let payout = amount - fee;
    let seeds: &[&[&[u8]]] = &[&[VAULT_SEED, &[ctx.accounts.escrow.vault_bump]]];

    token::transfer(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.freelancer_token.to_account_info(), authority: ctx.accounts.vault.to_account_info() },
        seeds,
    ), payout)?;

    if fee > 0 {
        token::transfer(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.treasury.to_account_info(), authority: ctx.accounts.vault.to_account_info() },
            seeds,
        ), fee)?;
    }

    let escrow = &mut ctx.accounts.escrow;
    escrow.released_amount += amount;
    if escrow.milestone_count > 0 {
        escrow.milestones[escrow.current_milestone as usize].completed = true;
        escrow.current_milestone += 1;
        escrow.state = if escrow.current_milestone >= escrow.milestone_count { EscrowState::Released } else { EscrowState::Locked };
    } else {
        escrow.state = EscrowState::Released;
    }

    emit!(FundsReleased { job_id: escrow.job_id, trigger, amount, fee, payout });
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────
#[derive(Accounts)]
#[instruction(job_id: [u8; 32])]
pub struct CreateJob<'info> {
    #[account(init, payer = client, space = EscrowAccount::LEN, seeds = [ESCROW_SEED, job_id.as_ref()], bump)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(init, payer = client, token::mint = mint, token::authority = vault, seeds = [VAULT_SEED, job_id.as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)] pub client: Signer<'info>,
    /// CHECK: stored as pubkey
    pub freelancer: AccountInfo<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = client)]
    pub client_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
pub struct ClientAction<'info> {
    #[account(mut, seeds = [ESCROW_SEED, escrow.job_id.as_ref()], bump = escrow.bump)]
    pub escrow: Account<'info, EscrowAccount>,
    pub client: Signer<'info>,
}
#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(mut, seeds = [ESCROW_SEED, escrow.job_id.as_ref()], bump = escrow.bump)]
    pub escrow: Account<'info, EscrowAccount>,
    pub freelancer: Signer<'info>,
}
#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(mut, seeds = [ESCROW_SEED, escrow.job_id.as_ref()], bump = escrow.bump)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut, seeds = [VAULT_SEED, escrow.job_id.as_ref()], bump = escrow.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    /// CHECK: verified via escrow.client
    pub client: AccountInfo<'info>,
    #[account(mut)] pub freelancer_token: Account<'info, TokenAccount>,
    #[account(mut)] pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(mut, seeds = [ESCROW_SEED, escrow.job_id.as_ref()], bump = escrow.bump)]
    pub escrow: Account<'info, EscrowAccount>,
    pub client: Signer<'info>,
}
#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut, seeds = [ESCROW_SEED, escrow.job_id.as_ref()], bump = escrow.bump)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut, seeds = [VAULT_SEED, escrow.job_id.as_ref()], bump = escrow.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    /// CHECK: arbitration program authority
    pub arbitration_authority: AccountInfo<'info>,
    #[account(mut)] pub freelancer_token: Account<'info, TokenAccount>,
    #[account(mut)] pub client_token: Account<'info, TokenAccount>,
    #[account(mut)] pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ─── State ───────────────────────────────────────────────────────────────────
#[account]
pub struct EscrowAccount {
    pub job_id:              [u8; 32],
    pub client:              Pubkey,
    pub freelancer:          Pubkey,
    pub mint:                Pubkey,
    pub total_amount:        u64,
    pub released_amount:     u64,
    pub ipfs_scope:          String,
    pub deadline:            i64,
    pub state:               EscrowState,
    pub created_at:          i64,
    pub delivered_at:        i64,
    pub client_last_seen:    i64,
    pub client_acknowledged: bool,
    pub ipfs_proof:          String,
    pub ai_confidence_bps:   u64,
    pub ai_report_hash:      [u8; 32],
    pub milestone_count:     u8,
    pub current_milestone:   u8,
    pub milestones:          [MilestoneRecord; 10],
    pub bump:                u8,
    pub vault_bump:          u8,
}
impl EscrowAccount {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + (4+64) + 8 + 1 + 8 + 8 + 8 + 1 + (4+64) + 8 + 32 + 1 + 1 + (MilestoneRecord::LEN*10) + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct MilestoneRecord { pub amount: u64, pub ipfs_scope: [u8; 64], pub completed: bool }
impl MilestoneRecord { pub const LEN: usize = 8 + 64 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MilestoneInput { pub amount: u64, pub ipfs_scope: String }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowState { Locked, Delivered, Released, Disputed, Refunded }

// ─── Events ───────────────────────────────────────────────────────────────────
#[event] pub struct JobCreated { pub job_id: [u8;32], pub client: Pubkey, pub freelancer: Pubkey, pub amount: u64, pub ipfs_scope: String, pub deadline: i64, pub milestone_count: u8 }
#[event] pub struct ClientAcknowledged { pub job_id: [u8;32], pub client: Pubkey, pub timestamp: i64 }
#[event] pub struct ProofSubmitted { pub job_id: [u8;32], pub freelancer: Pubkey, pub ipfs_proof: String, pub ai_report_hash: [u8;32], pub ai_confidence_bps: u64, pub milestone_index: u8, pub delivered_at: i64 }
#[event] pub struct FundsReleased { pub job_id: [u8;32], pub trigger: ReleaseTrigger, pub amount: u64, pub fee: u64, pub payout: u64 }
#[event] pub struct DisputeRaised { pub job_id: [u8;32], pub client: Pubkey, pub freelancer: Pubkey, pub reason_ipfs: String, pub ai_confidence_bps: u64, pub raised_at: i64 }
#[event] pub struct DisputeResolved { pub job_id: [u8;32], pub freelancer_wins: bool, pub amount: u64 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ReleaseTrigger { ClientApproval, AutoRelease, ArbitrationWin }

// ─── Errors ───────────────────────────────────────────────────────────────────
#[error_code]
pub enum AqorynError {
    #[msg("Amount must be greater than zero")]                          ZeroAmount,
    #[msg("Scope CID too long")]                                       ScopeTooLong,
    #[msg("Proof CID too long")]                                       ProofCIDTooLong,
    #[msg("Deadline must be in the future")]                           DeadlineInPast,
    #[msg("Invalid state for this instruction")]                       InvalidState,
    #[msg("Unauthorized signer")]                                      Unauthorized,
    #[msg("48h auto-release window not elapsed")]                      AutoReleaseNotReady,
    #[msg("Dispute window closed")]                                    DisputeWindowClosed,
    #[msg("No proof submitted")]                                       NoProofSubmitted,
    #[msg("AI confidence below 0.75 — manual review required")]        AiConfidenceTooLow,
    #[msg("Too many milestones (max 10)")]                             TooManyMilestones,
    #[msg("Milestone amounts must equal total")]                       MilestoneAmountMismatch,
    #[msg("Invalid milestone index")]                                  InvalidMilestoneIndex,
}
