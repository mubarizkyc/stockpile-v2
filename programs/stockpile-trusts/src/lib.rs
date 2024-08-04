use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod util;

use crate::state::vault::*;
pub use instructions::*;

//declare_id!("");
declare_id!("DHdGHuLQ2NK7nCDUCVkMa9fKkEG8zJQdiB3H8Dn4ngj");
#[program]
pub mod stockpile_trusts {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_id: u64,
        protocol: Protocols,
        interval: Intervals,
        initial_amount: u64,
        projects: Vec<Pubkey>,
        mint: Pubkey,
    ) -> Result<()> {
        instructions::init(
            ctx,
            vault_id,
            protocol,
            interval,
            initial_amount,
            projects,
            mint,
        )
    }

    pub fn deposit(ctx: Context<Deposit>, project_id: u64, amount: u64) -> Result<()> {
        instructions::deposit(ctx, project_id, amount)
    }

    pub fn withdraw_and_close(ctx: Context<Withdraw>, project_id: u64, amount: u64) -> Result<()> {
        instructions::withdraw(ctx, project_id, amount)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
