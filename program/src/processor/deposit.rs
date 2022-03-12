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
    amount: u64
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let exchange_booth_account = next_account_info(accounts_iter)?;
    let authority = next_account_info(accounts_iter)?;
    let token_account = next_account_info(accounts_iter)?;
    let vault = next_account_info(accounts_iter)?;
    let mint_a = next_account_info(accounts_iter)?;
    let mint_b = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;

    // check corret permissions
    if !authority.is_signer {
        msg!("owner must be signer");
        return Err(ExchangeBoothError::AccountIsNotSigner.into());
    }

    if !exchange_booth_account.is_writable {
        msg!("exchange booth account must be writable");
        return Err(ExchangeBoothError::AccountMustBeWritable.into());
    }

    if !vault.is_writable {
        msg!("vault must be writable");
        return Err(ExchangeBoothError::AccountMustBeWritable.into());
    }

    if !token_account.is_writable {
        msg!("the token account must be writable");
        return Err(ExchangeBoothError::AccountMustBeWritable.into());
    }

    let vault_account = Account::unpack_from_slice(&vault.try_borrow_data()?)?;

    let token_account_data =
        Account::unpack_from_slice(&token_account.try_borrow_data()?)?;


    let is_transfer_a_token = token_account_data.mint == *mint_a.key;
    let mint_to_transfer = if is_transfer_a_token { mint_a } else { mint_b };

    if vault_account.mint != token_account_data.mint {
        msg!("Vault account and token account have different mints");
        return Err(ExchangeBoothError::InvalidMint.into())
    }

    // check the owner of the exchange booth account
    let exchange_booth_data = &mut (*exchange_booth_account.data).borrow_mut();
    let xbooth_data = ExchangeBooth::try_from_slice(&exchange_booth_data)?;
    if xbooth_data.admin != *authority.key {
        msg!("owner is not admin for the exchange booth");
        return Err(ExchangeBoothError::InvalidAccountOwner.into());
    }

    // Check vault and exchange booth pdas
    let (_vault_pda, _vault_bump_seed) = processor::utils::get_vault_pda(
        program_id,
        exchange_booth_account,
        authority,
        mint_to_transfer,
        vault,
    )?;

    let (_xbooth_pda, _xbooth_bump) = processor::utils::get_exchange_booth_pda(
        program_id,
        exchange_booth_account,
        authority,
        mint_a,
        mint_b,
    )?;

    // check if enough funds in owner account
    let amount_lamports =
        processor::utils::amount_to_lamports(mint_to_transfer, amount)?;

    msg!("amount to transfer: {}", amount);
    msg!("lamports to transfer: {}", amount_lamports);

    if token_account_data.amount < amount_lamports {
        msg!("Insufficient fund!");
        return Err(ExchangeBoothError::InsufficientFunds.into());
    }
    msg!("lamports in token_account: {}", token_account_data.amount);

    // Transfer amount from owner to the vault
    let transfer_ix = instruction::transfer(
        &token_program.key,
        &token_account.key,
        &vault.key,
        &authority.key,
        &[&authority.key],
        amount_lamports,
    )?;

    invoke(
        &transfer_ix,
        &[
            token_program.clone(),
            token_account.clone(),
            vault.clone(),
            authority.clone(),
        ],
    )?;

    Ok(())
}