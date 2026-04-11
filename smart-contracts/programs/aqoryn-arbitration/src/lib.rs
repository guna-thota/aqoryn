use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AqRnARB1TRat10nDA0Jury5t4k3S1ash1ngPr0gram003");

pub const ARBITRATION_SEED: &[u8]  = b"aqoryn-arb";
pub const JUROR_SEED: &[u8]        = b"aqoryn-juror";
pub const STAKE_SEED: &[u8]        = b"aqoryn-stake";
pub const MIN_JURORS: u64          = 3;
pub const VOTING_PERIOD_SECS: i64  = 72 * 60 * 60;          // 72 hours
pub const MIN_STAKE_AQRN: u64      = 100_000_000;            // 100 AQRN (8 decimals)
pub const SLASH_BPS: u64           = 2000;                   // 20% slash on minority voters

#[program]
pub mod aqoryn_arbitration {
    use super::*;

    /// Open a dispute case — called by escrow program or client.
    pub fn open_case(
        ctx:         Context<OpenCase>,
        job_id:      [u8; 32],
        client:      Pubkey,
        freelancer:  Pubkey,
        reason_ipfs: String,
        ai_report_hash: [u8; 32],
        ai_confidence_bps: u64,
    ) -> Result<()> {
        let case  = &mut ctx.accounts.dispute_case;
        let clock = Clock::get()?;
        case.job_id              = job_id;
        case.client              = client;
        case.freelancer          = freelancer;
        case.reason_ipfs         = reason_ipfs.clone();
        case.ai_report_hash      = ai_report_hash;
        case.ai_confidence_bps   = ai_confidence_bps;
        case.votes_freelancer    = 0;
        case.votes_client        = 0;
        case.stake_freelancer    = 0;
        case.stake_client        = 0;
        case.state               = CaseState::Open;
        case.opened_at           = clock.unix_timestamp;
        case.voting_ends_at      = clock.unix_timestamp + VOTING_PERIOD_SECS;
        case.bump                = ctx.bumps.dispute_case;

        emit!(CaseOpened {
            job_id, client, freelancer,
            ai_confidence_bps,
            voting_ends_at: case.voting_ends_at,
        });
        Ok(())
    }

    /// Juror stakes AQRN tokens and casts a vote.
    /// Stake is locked until settlement. Minority voters are slashed.
    pub fn stake_and_vote(
        ctx:             Context<StakeAndVote>,
        vote_freelancer: bool,
        stake_amount:    u64,
    ) -> Result<()> {
        require!(stake_amount >= MIN_STAKE_AQRN, ArbError::InsufficientStake);

        let case   = &mut ctx.accounts.dispute_case;
        let record = &mut ctx.accounts.juror_vote_record;
        let clock  = Clock::get()?;

        require!(case.state == CaseState::Open, ArbError::CaseNotOpen);
        require!(clock.unix_timestamp < case.voting_ends_at, ArbError::VotingEnded);
        require!(!record.has_voted, ArbError::AlreadyVoted);

        // Transfer AQRN stake from juror to stake vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.juror_aqrn.to_account_info(),
                    to:        ctx.accounts.stake_vault.to_account_info(),
                    authority: ctx.accounts.juror.to_account_info(),
                },
            ),
            stake_amount,
        )?;

        record.juror          = ctx.accounts.juror.key();
        record.job_id         = case.job_id;
        record.has_voted      = true;
        record.vote_freelancer = vote_freelancer;
        record.stake_amount   = stake_amount;
        record.voted_at       = clock.unix_timestamp;
        record.slashed        = false;
        record.bump           = ctx.bumps.juror_vote_record;

        if vote_freelancer {
            case.votes_freelancer  += 1;
            case.stake_freelancer  += stake_amount;
        } else {
            case.votes_client      += 1;
            case.stake_client      += stake_amount;
        }

        emit!(VoteCast {
            job_id:          case.job_id,
            juror:           ctx.accounts.juror.key(),
            vote_freelancer,
            stake_amount,
        });
        Ok(())
    }

    /// Settle after voting period. Slashes minority voters (20% of stake).
    pub fn settle_case(ctx: Context<SettleCase>) -> Result<()> {
        let case  = &mut ctx.accounts.dispute_case;
        let clock = Clock::get()?;

        require!(case.state == CaseState::Open, ArbError::CaseNotOpen);
        require!(clock.unix_timestamp >= case.voting_ends_at, ArbError::VotingNotEnded);
        require!(case.votes_freelancer + case.votes_client >= MIN_JURORS, ArbError::InsufficientJurors);

        let freelancer_wins = case.votes_freelancer > case.votes_client;

        case.state = if freelancer_wins { CaseState::FreelancerWon } else { CaseState::ClientWon };

        // Calculate slash amount from losing side
        let minority_stake = if freelancer_wins { case.stake_client } else { case.stake_freelancer };
        let slash_total    = minority_stake.checked_mul(SLASH_BPS).unwrap() / 10_000;

        emit!(CaseSettled {
            job_id:          case.job_id,
            freelancer_wins,
            votes_freelancer: case.votes_freelancer,
            votes_client:     case.votes_client,
            slash_amount:     slash_total,
        });
        Ok(())
    }

    /// Release stake back to juror (majority voters get their stake + share of slashed funds).
    pub fn claim_stake(ctx: Context<ClaimStake>) -> Result<()> {
        let case   = &ctx.accounts.dispute_case;
        let record = &mut ctx.accounts.juror_vote_record;

        require!(
            case.state == CaseState::FreelancerWon || case.state == CaseState::ClientWon,
            ArbError::CaseNotSettled
        );
        require!(!record.slashed, ArbError::AlreadySlashed);
        require!(record.has_voted, ArbError::NotAJuror);

        let freelancer_wins  = case.state == CaseState::FreelancerWon;
        let voted_with_majority = record.vote_freelancer == freelancer_wins;

        let seeds: &[&[&[u8]]] = &[&[STAKE_SEED, case.job_id.as_ref(), &[ctx.bumps.stake_vault]]];

        let return_amount = if voted_with_majority {
            // Return full stake (bonus logic from slashed funds can be added)
            record.stake_amount
        } else {
            // Slash 20% — return 80%
            record.slashed = true;
            let slash = record.stake_amount.checked_mul(SLASH_BPS).unwrap() / 10_000;
            record.stake_amount - slash
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.stake_vault.to_account_info(),
                    to:        ctx.accounts.juror_aqrn.to_account_info(),
                    authority: ctx.accounts.stake_vault.to_account_info(),
                },
                seeds,
            ),
            return_amount,
        )?;

        emit!(StakeClaimed {
            job_id:         case.job_id,
            juror:          record.juror,
            returned:       return_amount,
            slashed:        !voted_with_majority,
        });
        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────────────────────
#[derive(Accounts)]
#[instruction(job_id: [u8; 32])]
pub struct OpenCase<'info> {
    #[account(init, payer = payer, space = DisputeCase::LEN, seeds = [ARBITRATION_SEED, job_id.as_ref()], bump)]
    pub dispute_case: Account<'info, DisputeCase>,
    #[account(mut)] pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeAndVote<'info> {
    #[account(mut, seeds = [ARBITRATION_SEED, dispute_case.job_id.as_ref()], bump = dispute_case.bump)]
    pub dispute_case: Account<'info, DisputeCase>,
    #[account(
        init, payer = juror, space = JurorVoteRecord::LEN,
        seeds = [JUROR_SEED, dispute_case.job_id.as_ref(), juror.key().as_ref()], bump
    )]
    pub juror_vote_record: Account<'info, JurorVoteRecord>,
    #[account(
        init_if_needed, payer = juror,
        token::mint = aqrn_mint,
        token::authority = stake_vault,
        seeds = [STAKE_SEED, dispute_case.job_id.as_ref()], bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub juror: Signer<'info>,
    #[account(mut)] pub juror_aqrn: Account<'info, TokenAccount>,
    pub aqrn_mint: Account<'info, anchor_spl::token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SettleCase<'info> {
    #[account(mut, seeds = [ARBITRATION_SEED, dispute_case.job_id.as_ref()], bump = dispute_case.bump)]
    pub dispute_case: Account<'info, DisputeCase>,
}

#[derive(Accounts)]
pub struct ClaimStake<'info> {
    #[account(seeds = [ARBITRATION_SEED, dispute_case.job_id.as_ref()], bump = dispute_case.bump)]
    pub dispute_case: Account<'info, DisputeCase>,
    #[account(mut, seeds = [JUROR_SEED, dispute_case.job_id.as_ref(), juror.key().as_ref()], bump = juror_vote_record.bump)]
    pub juror_vote_record: Account<'info, JurorVoteRecord>,
    #[account(mut, seeds = [STAKE_SEED, dispute_case.job_id.as_ref()], bump)]
    pub stake_vault: Account<'info, TokenAccount>,
    pub juror: Signer<'info>,
    #[account(mut)] pub juror_aqrn: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ─── State ───────────────────────────────────────────────────────────────────
#[account]
pub struct DisputeCase {
    pub job_id:           [u8; 32],
    pub client:           Pubkey,
    pub freelancer:       Pubkey,
    pub reason_ipfs:      String,
    pub ai_report_hash:   [u8; 32],
    pub ai_confidence_bps: u64,
    pub votes_freelancer: u64,
    pub votes_client:     u64,
    pub stake_freelancer: u64,
    pub stake_client:     u64,
    pub state:            CaseState,
    pub opened_at:        i64,
    pub voting_ends_at:   i64,
    pub bump:             u8,
}
impl DisputeCase {
    pub const LEN: usize = 8 + 32 + 32 + 32 + (4+64) + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1;
}

#[account]
pub struct JurorVoteRecord {
    pub juror:          Pubkey,
    pub job_id:         [u8; 32],
    pub has_voted:      bool,
    pub vote_freelancer: bool,
    pub stake_amount:   u64,
    pub voted_at:       i64,
    pub slashed:        bool,
    pub bump:           u8,
}
impl JurorVoteRecord {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CaseState { Open, FreelancerWon, ClientWon }

// ─── Events ───────────────────────────────────────────────────────────────────
#[event] pub struct CaseOpened { pub job_id: [u8;32], pub client: Pubkey, pub freelancer: Pubkey, pub ai_confidence_bps: u64, pub voting_ends_at: i64 }
#[event] pub struct VoteCast { pub job_id: [u8;32], pub juror: Pubkey, pub vote_freelancer: bool, pub stake_amount: u64 }
#[event] pub struct CaseSettled { pub job_id: [u8;32], pub freelancer_wins: bool, pub votes_freelancer: u64, pub votes_client: u64, pub slash_amount: u64 }
#[event] pub struct StakeClaimed { pub job_id: [u8;32], pub juror: Pubkey, pub returned: u64, pub slashed: bool }

// ─── Errors ───────────────────────────────────────────────────────────────────
#[error_code]
pub enum ArbError {
    #[msg("Case is not Open")]          CaseNotOpen,
    #[msg("Voting ended")]              VotingEnded,
    #[msg("Voting not ended yet")]      VotingNotEnded,
    #[msg("Already voted")]             AlreadyVoted,
    #[msg("Not enough jurors (min 3)")] InsufficientJurors,
    #[msg("Stake below minimum")]       InsufficientStake,
    #[msg("Case not settled yet")]      CaseNotSettled,
    #[msg("Stake already claimed/slashed")] AlreadySlashed,
    #[msg("Not registered as juror")]   NotAJuror,
}
