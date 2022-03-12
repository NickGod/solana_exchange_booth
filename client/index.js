const {
    Connection,
    sendAndConfirmTransaction,
    Keypair,
    Transaction,
    SystemProgram,
    PublicKey,
    TransactionInstruction,
    SYSVAR_RENT_PUBKEY,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
  } = require("@solana/web3.js");
  
  const {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createInitializeMintInstruction,
    getAssociatedTokenAddress,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    createMint,
    getAccount,
  } = require("@solana/spl-token");
  const BN = require("bn.js");
  
  const main = async () => {
    var args = process.argv.slice(2);
    const programId = new PublicKey(args[0]);
    const echo = args[1];
  
    const connection = new Connection(
      clusterApiUrl('devnet'),
      'confirmed'
    );
      
    const authority = new Keypair(); // signer and paying account
    const tokenProgram = TOKEN_PROGRAM_ID;
    const rentAccountId = SYSVAR_RENT_PUBKEY;
    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();

    console.log("Checking toekn program id");
    console.log(tokenProgram.toString());

    const bufferSeed = 9;
  
    for (let i = 0; i < 5; i++) {
      console.log("Requesting Airdrop of 1 SOL...");
      await connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);
      console.log("Airdrop received");

      await new Promise(r => setTimeout(r, 10000));
    }

    // await new Promise(r => setTimeout(r, 10000));
    // console.log("Requesting Airdrop of 1 SOL for token account...");
    // await connection.requestAirdrop(tokenAccount.publicKey, 2e9);
    // console.log("Airdrop received");
  
    const mintA = await createMint(
      connection,
      authority,
      authority.publicKey,
      freezeAuthority.publicKey,
      0,
    );

    console.log("mint A is created");

    const mintB = await createMint(
      connection,
      authority,
      authority.publicKey,
      freezeAuthority.publicKey,
      1,
    );

    console.log("mints are created");

    // mint tokens to token account
    const tokenAccountA = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mintA,
      authority.publicKey,
    )
  
    await mintTo(
      connection,
      authority,
      mintA,
      tokenAccountA.address,
      authority,
      100,
    );

    const tokenAccountB = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mintB,
      authority.publicKey,
    )

    await mintTo(
      connection,
      authority,
      mintB,
      tokenAccountB.address,
      authority,
      1000,
    )


    console.log("checking token account A amount");
    let tokenAccountAInfo = await getAccount(
      connection,
      tokenAccountA.address
    );
    console.log(tokenAccountAInfo.amount);

    console.log("checking token account B amount");
    let tokenAccountBInfo = await getAccount(
      connection,
      tokenAccountB.address
    );
    console.log(tokenAccountBInfo.amount);


    // PDAs: exchange booth account, vault a, vault b
    const [exchangeBoothKey, ebBumpSeed] = (await PublicKey.findProgramAddress(
      [Buffer.from("xbooth", "ascii"), authority.publicKey.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
      programId
    ));
  
    const [vaultAKey, vaultABumpSeed]  = (await PublicKey.findProgramAddress(
      [Buffer.from("xbooth", "ascii"), authority.publicKey.toBuffer(), mintA.toBuffer(), exchangeBoothKey.toBuffer()],
      programId
    ));

    const [vaultBKey, vaultBBumpSeed]  = (await PublicKey.findProgramAddress(
      [Buffer.from("xbooth", "ascii"), authority.publicKey.toBuffer(), mintB.toBuffer(), exchangeBoothKey.toBuffer()],
      programId
    ));

    let initializeIx = new TransactionInstruction({
      keys: [
        {
          pubkey: exchangeBoothKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: authority.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: mintA,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mintB,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: vaultAKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: vaultBKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: tokenProgram,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: rentAccountId,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from(new Uint8Array([0])), // initializeAuthroizedEcho
      ]),
    });
  
    let depositAIx = new TransactionInstruction({
      keys: [
        {
          pubkey: exchangeBoothKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: authority.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: tokenAccountA.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: vaultAKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: mintA,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mintB,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: tokenProgram,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from(new Uint8Array([1])), // deposit
        Buffer.from(new Uint8Array((new BN(100)).toArray("le", 8))), // amount
      ]),
    });
  
    let depositBIx = new TransactionInstruction({
      keys: [
        {
          pubkey: exchangeBoothKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: authority.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: tokenAccountB.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: vaultBKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: mintA,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mintB,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: tokenProgram,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from(new Uint8Array([1])), // deposit
        Buffer.from(new Uint8Array((new BN(100)).toArray("le", 8))), // amount
      ]),
    });
  
    let withdrawIx = new TransactionInstruction({
      keys: [
        {
          pubkey: exchangeBoothKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: authority.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: tokenAccountA.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: vaultAKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: mintA,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mintB,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: tokenProgram,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from(new Uint8Array([2])), // withdraw
        Buffer.from(new Uint8Array((new BN(100)).toArray("le", 8))), // amount
      ]),
    });

    let exchangeIx = new TransactionInstruction({
      keys: [
        {
          pubkey: exchangeBoothKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: authority.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: tokenAccountA.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: tokenAccountB.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: vaultAKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: vaultBKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: mintA,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mintB,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: tokenProgram,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from(new Uint8Array([3])), // exchange
        Buffer.from(new Uint8Array((new BN(50)).toArray("le", 8))), // amount
      ]),
    });
  
    let tx = new Transaction();

    tx.add(initializeIx);
    // tx.add(depositAIx);
    tx.add(depositBIx);

    tx.add(exchangeIx);
  
    let txid = await sendAndConfirmTransaction(
      connection,
      tx,
      [authority],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        confirmation: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
  
    console.log("checking token account amount after deposit");
    tokenAccountAInfo = await getAccount(
      connection,
      tokenAccountA.address
    );
    console.log(tokenAccountAInfo.amount);

    tokenAccountBInfo = await getAccount(
      connection,
      tokenAccountB.address
    );
    console.log(tokenAccountBInfo.amount);
  };
  
  main()
    .then(() => {
      console.log("Success");
    })
    .catch((e) => {
      console.error(e);
    });
  