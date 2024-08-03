import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StockpileV2 } from "../target/types/stockpile_v2";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from 'chai'
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
const fs = require('fs');

/*
Localnet env works about half the time depending on version. These
tests are set to devnet so they'll run everytime, however this comes
with drawbacks. They're almost certain to never pass since they rely
on devnet airdrops, and you know how that goes. However we can deduce
whether they would've worked. I've skipped pre-flight on each instruction
so log will print to the console once the tests finish. 0x1 represents 
"lack of funds from payer", and means the instruction would have worked 
if we were on localnet, or staging with a real wallet. Additionally,
I haven't found a reliable devnet faucet for USDC, so there's another
constraint for ya.

Eventually I'll write a CI pipeline, which I anticipate will run the test
validator without fail, unlike my machine.

TLDR: These tests fail on devnet because Solana is a game of versioning
whack-a-mole. If your machine can run localnet, then do that.
*/

describe("stockpile-v2", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);
  const payer = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("/home/mubariz/.config/solana/id.json", 'utf8'))));
  // const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));

  const program = anchor.workspace.StockpileV2 as Program<StockpileV2>;

  it("createProject", async () => {
    // Generate keypairs for payer, and admins

    const adminKp1 = anchor.web3.Keypair.generate();
    const adminKp2 = anchor.web3.Keypair.generate();

    // Generate a beneficiary keypair and random projectId
    const beneficiary = anchor.web3.Keypair.generate().publicKey;
    const projectId = Math.floor(1000 + Math.random() * 9000);

    // Find PDA address
    const [fundraiserPDA, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fundraiser"), new anchor.BN(projectId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    console.log("fundraiserPDA:", fundraiserPDA.toString());

    // Define dummy values
    const name = "Nautilus";
    const admins = [adminKp1.publicKey, adminKp2.publicKey];
    const goal = 100;
    /*
        // Debugging logs
        console.log('payer.publicKey:', payer.publicKey.toString());
        console.log('fundraiserPDA:', fundraiserPDA.toString());
        console.log('beneficiary:', beneficiary.toString());
        console.log('projectId:', projectId);
        console.log('name:', name);
        console.log('admins:', admins.map(admin => admin.toString()));
        console.log('goal:', goal);
    */
    try {
      // Let it fly
      const tx = await program.methods.createProject(
        new anchor.BN(projectId),
        name,
        admins,
        beneficiary,
        new anchor.BN(goal)
      )
        .accounts({
          payer: payer.publicKey,
          project: fundraiserPDA,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([payer])
        .rpc({
          skipPreflight: true
        });

      // If it passes, we get a friendly message
      console.log(`🚀 Project "${name}" Created! Transaction Hash:`, tx);
    } catch (err) {
      console.error('Error creating project:', err);
    }
  });

  it("createPool", async () => {
    // Generate payer keypair, and random poolId
    const admin1 = anchor.web3.Keypair.generate();
    const admin2 = anchor.web3.Keypair.generate();
    const admin3 = anchor.web3.Keypair.generate();
    let poolId = Math.floor(1000 + Math.random() * 9000);


    // Find PDA address
    const utf8 = anchor.utils.bytes.utf8;
    const [poolPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode("pool"), new anchor.BN(poolId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Define dummy values
    let name = "Money Laundering Machine";
    let start = new anchor.BN(Math.floor(Date.now() / 1000) + 300); // 5 minutes from now
    let end = new anchor.BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    let admins = [admin1.publicKey, admin2.publicKey, admin3.publicKey];
    let access = { open: {} };  // Or { manual: {} } depending on your enum variant


    console.log("Program ID:", program.programId);
    console.log("Pool PDA:", poolPDA.toBase58());
    try {
      console.log("Starting pool creation...");

      const tx = await program.methods.createPool(
        new anchor.BN(poolId),
        name,
        new anchor.BN(start.toString()),
        new anchor.BN(end.toString()),
        admins,
        access
      )
        .accounts({
          pool: poolPDA,
          payer: payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      console.log(`👾 Funding Round "${name}" Initialized! Transaction Hash:`, tx);
    } catch (error) {
      console.error("Failed to create pool:", error);
      if (error instanceof anchor.AnchorError) {
        console.error("Error Code:", error.error.errorCode.code);
        console.error("Error Message:", error.error.errorMessage);
      }
    }
  });


  it("createSource", async () => {

    // Find PDA address
    const utf8 = anchor.utils.bytes.utf8;
    let poolId = Math.floor(1000 + Math.random() * 9000);
    const name = "Buffalo Joe";
    const amount = 1000000; // Example amount

    const encodedName = Buffer.from(name);

    // Find PDA address for the source
    const [sourcePDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        utf8.encode("source"), // Ensure this matches the Rust SEED_PREFIX
        encodedName, // Buffer encoded name
        new anchor.BN(poolId).toArrayLike(Buffer, "le", 8),
        new anchor.BN(amount).toArrayLike(Buffer, "le", 8),
        payer.publicKey.toBytes() // Ensure this matches the payer key in Rust
      ],
      program.programId
    );
    console.log("Pool Id", poolId)


    try {
      const tx = await program.methods.createSource(
        name,
        new anchor.BN(poolId),
        new anchor.BN(amount)
      )
        .accounts({
          source: sourcePDA,
          payer: payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc({
        });

      // If it passes, we get a friendly message
      console.log(`✨ Source "${name}" Created! Transaction Hash:`, tx);
    } catch (error) {
      console.error("Failed to create source:", error);
    }
  });


  it("joinPool", async () => {
    // Generate keypairs for admins
    let adminKp1 = Keypair.generate();
    let adminKp2 = Keypair.generate();

    // Fund payer account


    let beneficiary = Keypair.generate().publicKey;
    let projectId = Math.floor(1000 + Math.random() * 9000);
    let poolId = Math.floor(1000 + Math.random() * 9000);
    console.log("Pool Id", poolId)
    console.log("Project Id", projectId)

    // Find project PDA address
    const [fundraiserPDA, fundraiserBump] = await PublicKey.findProgramAddress(
      [Buffer.from("fundraiser"), new anchor.BN(projectId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Define dummy values
    let projectName = "Motherfuckin' Demons from the planet Jupiter";
    let admins = [payer.publicKey, adminKp1.publicKey, adminKp2.publicKey];
    let goal = 100;

    try {
      // Create project
      const projectTx = await program.methods.createProject(
        new anchor.BN(projectId),
        projectName,
        admins,
        beneficiary,
        new anchor.BN(goal)
      )
        .accounts({
          payer: payer.publicKey,
          project: fundraiserPDA,
          systemProgram: SystemProgram.programId
        })
        .signers([payer])
        .rpc();

      console.log(`Project Created Tx Hash: ${projectTx}`);

      // Find pool PDA address
      const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
        [Buffer.from("pool"), new anchor.BN(poolId).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Define more dummy values
      let poolName = "Dill Clyntin";
      let start = new anchor.BN(Math.floor(Date.now() / 1000) + 300); // 5 minutes from now
      let end = new anchor.BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      let access = { open: {} };  // Or { manual: {} } depending on your enum variant

      // Create a pool
      const poolTx = await program.methods.createPool(
        new anchor.BN(poolId),
        poolName,
        start,
        end,
        admins, access
      )
        .accounts({
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          pool: poolPDA,
        })
        .signers([payer])
        .rpc();

      console.log(`Pool Created Tx Hash: ${poolTx}`);

      // Join pool
      const tx = await program.methods.joinPool(
        new anchor.BN(projectId),
        new anchor.BN(poolId)
      )
        .accounts({
          payer: payer.publicKey,
          pool: poolPDA,
          project: fundraiserPDA,
          systemProgram: SystemProgram.programId
        })
        .signers([payer])
        .rpc();

      console.log(`✨ Pool "${poolName}" Joined w/ Project "${projectName}"! Join Tx Hash: ${tx}`);

      // Validate accounts after joining
      const poolAccount = await program.account.pool.fetch(poolPDA);
      const projectAccount = await program.account.project.fetch(fundraiserPDA);

      //console.log("Pool Account:", poolAccount);
      // console.log("Project Account:", projectAccount);

      // Add validation as needed
      assert(poolAccount.projectShares.some((p) => p.projectKey.equals(fundraiserPDA)), "Project not found in pool");

    } catch (error) {
      console.error("Error during joinPool test:", error);
      const signature = (error as any).signature;
      if (signature) {
        const status = await provider.connection.getSignatureStatus(signature);
        console.error("Transaction status:", status);
      }
    }


  });


});
