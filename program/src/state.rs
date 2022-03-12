use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;
use std::mem::size_of;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ExchangeBooth {
    pub admin: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    // TODO
}

pub const EXCHANGE_BOOTH_ACCOUNT_LEN: usize = size_of::<Pubkey>() * 3;
