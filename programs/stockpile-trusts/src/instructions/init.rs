use anchor_lang::prelude::*;

use crate::{Intervals, Protocols, YieldVault};

pub fn init(
    ctx: Context<InitializeVault>,
    _vault_id: u64,
    protocol: Protocols,
    interval: Intervals,
    initial_amount: u64,
    projects: Vec<Pubkey>,
    mint: Pubkey,
) -> Result<()> {
    ctx.accounts.vault.set_inner(YieldVault::new(
        protocol,
        interval,
        initial_amount,
        _vault_id,
        projects,
        mint,
        ctx.bumps.vault,
    )?);
    Ok(())
}

#[derive(Accounts)]
#[instruction(
    vault_id: u64,
)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = payer,
        space = YieldVault::SPACE,
        seeds = [
            YieldVault::SEED_PREFIX.as_bytes(),
            vault_id.to_le_bytes().as_ref(),
            payer.key().as_ref()
        ],
        bump,
    )]
    pub vault: Account<'info, YieldVault>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
