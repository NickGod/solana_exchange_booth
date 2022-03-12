import argparse
import time
from typing import NamedTuple
import struct
import base64, base58
from solana.publickey import PublicKey
from solana.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solana.rpc.commitment import Confirmed
from solana.system_program import CreateAccountParams, create_account, SYS_PROGRAM_ID
from solana.transaction import AccountMeta, TransactionInstruction, Transaction
from solana.sysvar import SYSVAR_RENT_PUBKEY
from spl.token.constants import TOKEN_PROGRAM_ID, MINT_LEN
from spl.token.instructions import (
    initialize_mint,
    InitializeMintParams,
    TOKEN_PROGRAM_ID,
    create_associated_token_account,
    get_associated_token_address,
    mint_to_checked,
    MintToCheckedParams,
)

RPC_URL = "https://api.devnet.solana.com"


def get_rent(size):
    client = Client(RPC_URL)
    lamports = client.get_minimum_balance_for_rent_exemption(size)["result"]
    return lamports


def send_transaction(tx, signers):
    client = Client(RPC_URL)
    result = client.send_transaction(
        tx,
        *signers,
        opts=TxOpts(skip_preflight=True),
    )
    tx_hash = result["result"]
    return client.confirm_transaction(tx_hash, commitment=Confirmed)


def create_test_mint(
    authority: Keypair,
    mint_decimals=0
):
    mint = Keypair()

    txn = Transaction(fee_payer=authority.public_key)
    txn.add(
        create_account(
            CreateAccountParams(
                from_pubkey=authority.public_key,
                new_account_pubkey=mint.public_key,
                lamports=get_rent(MINT_LEN),
                space=MINT_LEN,
                program_id=TOKEN_PROGRAM_ID,
            )
        )
    )
    txn.add(
        initialize_mint(
            InitializeMintParams(
                program_id=TOKEN_PROGRAM_ID,
                mint=mint.public_key,
                decimals=mint_decimals,
                mint_authority=authority.public_key,
                freeze_authority=None,
            )
        )
    )
    signers = [authority, mint]
    result = send_transaction(txn, signers)
    return mint.public_key


def mint_tokens_to(
    mint: PublicKey,
    authority: Keypair,
    to_user: PublicKey,
    amount,
    mint_decimals=0,
    create=True,
):
    token_address = get_associated_token_address(to_user, mint)

    txn = Transaction(fee_payer=authority.public_key)
    if create:
        txn.add(
            create_associated_token_account(authority.public_key, to_user, mint)
        )
    txn.add(
        mint_to_checked(
            MintToCheckedParams(
                TOKEN_PROGRAM_ID,
                mint,
                token_address,
                authority.public_key,
                amount,
                mint_decimals,
            )
        )
    )
    signers = [authority]
    result = send_transaction(txn, signers)
    return token_address
