/**
 * Claim Solana NTT ownership after transfer
 * Edit CONFIG below and run: yarn claim-ownership
 */

import * as anchor from '@project-serum/anchor';
import { Connection } from '@solana/web3.js';
import { getNttProgram, NTT } from '@wormhole-foundation/sdk-solana-ntt';
const fs = require('fs');

// Configuration
const CONFIG = {
	// TODO: change to your NTT manager address
	ntt_manager: "nb6oAxYKDQa66w4qVES6RMxLzxneKB5DQBDn4p5sWff",
	// TODO: update RPC endpoint
	rpc_endpoint: 'https://api.devnet.solana.com',
	// TODO: change to the NTT version you're using (2.0.0 or 3.0.0)
	ntt_version: '3.0.0',
	// TODO: path to NEW owner's wallet keypair (the one ownership was transferred to)
	wallet_path: 'wallet.json',
} as const;

(async () => {
	console.log("=== Claim Ownership Configuration ===");
	console.log("NTT Manager:", CONFIG.ntt_manager);
	
	// Load NEW owner wallet (the one ownership was transferred to)
	const walletJSON = JSON.parse(fs.readFileSync(CONFIG.wallet_path, 'utf-8'));
	const walletKeypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(walletJSON));
	console.log("New Owner (claiming):", walletKeypair.publicKey.toString());

	const connection = new Connection(CONFIG.rpc_endpoint, 'confirmed');

	// Get the NTT program
	const program = getNttProgram(
		connection,
		CONFIG.ntt_manager,
		CONFIG.ntt_version
	);

	// Create the claim ownership instruction using the SDK
	const claimIx = await NTT.createClaimOwnershipInstruction(program as any, {
		newOwner: walletKeypair.publicKey,
	});

	console.log("\n=== Executing Claim ===");
	
	// Create and send transaction
	const wallet = new anchor.Wallet(walletKeypair);
	const provider = new anchor.AnchorProvider(connection, wallet, {
		preflightCommitment: 'confirmed',
	});
	
	const tx = await provider.sendAndConfirm(
		new anchor.web3.Transaction().add(claimIx)
	);

	console.log("✓ Claim successful!");
	console.log("Transaction signature:", tx);
	console.log(`\nOwnership is now: ${walletKeypair.publicKey.toString()}`);
})();

