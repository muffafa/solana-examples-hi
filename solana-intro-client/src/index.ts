import * as Web3 from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";
dotenv.config();

async function initializeKeypair(
  connection: Web3.Connection
): Promise<Web3.Keypair> {
  if (!process.env.PRIVATE_KEY) {
    console.log("Generating new keypair... 🗝️");
    const signer = Web3.Keypair.generate();

    console.log("Creating .env file");
    fs.writeFileSync(".env", `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

    return signer;
  }

  const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = Web3.Keypair.fromSecretKey(secretKey);
  return keypairFromSecret;
}

async function airdropSolIfNeeded(
  signer: Web3.Keypair,
  connection: Web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log("Current balance is", balance / Web3.LAMPORTS_PER_SOL, "SOL");

  // 1 SOL should be enough for almost anything you wanna do
  if (balance / Web3.LAMPORTS_PER_SOL < 1) {
    // You can only get up to 2 SOL per request
    console.log("Airdropping 1 SOL");
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      Web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log("New balance is", newBalance / Web3.LAMPORTS_PER_SOL, "SOL");
  }
}

async function checkBalance(connection: Web3.Connection, signer: Web3.Keypair) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log("Current balance is", balance / Web3.LAMPORTS_PER_SOL, "SOL");
}

async function pingProgram(
  connection: Web3.Connection,
  payer: Web3.Keypair,
  PROGRAM_DATA_PUBLIC_KEY: Web3.PublicKey,
  PROGRAM_ID: Web3.PublicKey
) {
  const transaction = new Web3.Transaction();
  const instruction = new Web3.TransactionInstruction({
    // Instructions need 3 things

    // 1. The public keys of all the accounts the instruction will read/write
    keys: [
      {
        pubkey: PROGRAM_DATA_PUBLIC_KEY,
        isSigner: false,
        isWritable: true,
      },
    ],

    // 2. The ID of the program this instruction will be sent to
    programId: PROGRAM_ID,

    // 3. Data - in this case, there's none!
  });

  transaction.add(instruction);
  const transactionSignature = await Web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );

  console.log(
    `Transaction https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

async function sendSol(
  connection: Web3.Connection,
  amount: number,
  to: Web3.PublicKey,
  sender: Web3.Keypair
) {
  const transaction = new Web3.Transaction();

  const sendSolInstruction = Web3.SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: to,
    lamports: amount,
  });

  transaction.add(sendSolInstruction);

  const sig = await Web3.sendAndConfirmTransaction(connection, transaction, [
    sender,
  ]);
  console.log(
    `You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`
  );
}

async function main() {
  const connection = new Web3.Connection(Web3.clusterApiUrl("devnet"));
  const signer = await initializeKeypair(connection);

  console.log("Public key:", signer.publicKey.toBase58());

  // //if necessary get airdrop
  // await airdropSolIfNeeded(signer, connection);

  // const PROGRAM_ID = new Web3.PublicKey(
  //   "ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa"
  // );
  // const PROGRAM_DATA_PUBLIC_KEY = new Web3.PublicKey(
  //   "Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod"
  // );

  // await pingProgram(connection, signer, PROGRAM_DATA_PUBLIC_KEY, PROGRAM_ID);

  // const MY_PUBLIC_KEY = new Web3.PublicKey("2AYwCyUGr53qup83zV58vaXVkBZkrsa7iFKg5c5xgQLJ");

  // await checkBalance(connection, signer);

  // await sendSol(connection, 0.1*Web3.LAMPORTS_PER_SOL, MY_PUBLIC_KEY, signer);

  await checkBalance(connection, signer);
}

main()
  .then(() => {
    console.log("Finished successfully lol");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
