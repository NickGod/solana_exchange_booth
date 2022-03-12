use solana_program::{
    account_info::next_account_info,
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction::create_account,
    sysvar::Sysvar,
};

use spl_token::{instruction, state::Account, check_program_account};

use crate::{
    error::ExchangeBoothError,
    state::ExchangeBooth,
};
use crate::state;
use crate::processor;
use borsh::{BorshDeserialize, BorshSerialize};



pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let exchange_booth_account = next_account_info(accounts_iter)?;
    let authority_account = next_account_info(accounts_iter)?;
    let token_account = next_account_info(accounts_iter)?;
    let vault_account = next_account_info(accounts_iter)?;
    let mint_a = next_account_info(accounts_iter)?;
    let mint_b = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;

    // * Checks checks checks
    // check permissions
    if !authority_account.is_signer {
        msg!("authority is not a signer!");
        return Err(ExchangeBoothError::AccountIsNotSigner.into());
    }

    if !vault_account.is_writable {
        msg!("vault needs to be writable");
        return Err(ExchangeBoothError::AccountMustBeWritable.into());
    }

    // if !token_account.is_signer {
    //     msg!("token account needs to be signer");
    //     return Err(ExchangeBoothError::AccountIsNotSigner.into());
    // }

    if !token_account.is_writable {
        msg!("token account must be writable");
        return Err(ExchangeBoothError::AccountMustBeWritable.into());
    }

    if !exchange_booth_account.is_writable {
        msg!("Exchange booth needs to be writable");
        return Err(ExchangeBoothError::AccountMustBeWritable.into());
    }

    // check ownership of exchange booth
    let (_xbooth_pda, xbooth_bump) = processor::utils::get_exchange_booth_pda(
        program_id,
        exchange_booth_account,
        authority_account,
        mint_a,
        mint_b,
    )?;

    // check ownership of vault
    let (_vault_pda, vault_bump) = processor::utils::get_vault_pda(
        program_id,
        exchange_booth_account,
        authority_account,
        mint_a,
        vault_account,
    )?;

    // check stored admin/owner of exchange booth
    processor::utils::check_stored_owner(exchange_booth_account, authority_account)?;

    // * withdraw money from vault into token_account using spl program
    // Check amount in vault
    let vault_account_data =
        spl_token::state::Account::unpack_from_slice(&vault_account.data.borrow())?;

    let amount_lamports = processor::utils::amount_to_lamports(mint_a, amount)?;
    msg!("withdrawing amount from vault to token account: {}", amount_lamports);

    if amount_lamports > vault_account_data.amount {
        msg!("insufficient funds in vault accounts");
        return Err(ExchangeBoothError::InsufficientFunds.into());
    }

    let transfer_ix = spl_token::instruction::transfer(
        &token_program.key,
        &vault_account.key,
        &token_account.key,
        &exchange_booth_account.key,
        &[],
        amount_lamports,
    )?;

    invoke_signed(
        &transfer_ix,
        &[
            token_program.clone(),
            vault_account.clone(),
            token_account.clone(),
            exchange_booth_account.clone(),
        ],
        &[&[
            b"xbooth",
            authority_account.key.as_ref(),
            mint_a.key.as_ref(),
            mint_b.key.as_ref(),
            &[xbooth_bump],
        ]],
    )?;

    Ok(())
}
