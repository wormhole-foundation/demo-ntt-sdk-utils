/**
 * Transfer Solana NTT ownership to a new wallet
 * Edit CONFIG below and run: yarn transfer-ownership
 */

import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { getNttProgram, NTT } from '@wormhole-foundation/sdk-solana-ntt';
const fs = require('fs');

// Configuration
const CONFIG = {
	// TODO: change to your NTT manager address
	ntt_manager: "nb6oAxYKDQa66w4qVES6RMxLzxneKB5DQBDn4p5sWff",
	// TODO: change to the new owner's public key
	new_owner_pubkey: "wa6f7GdNNkX4MysZtkv4hCUE6bN3XmkKTudQp44bB3T",
	// TODO: update RPC endpoint
	rpc_endpoint: 'https://api.devnet.solana.com',
	// TODO: change to the NTT version you're using (2.0.0 or 3.0.0)
	ntt_version: '3.0.0',
	// TODO: path to current owner's wallet keypair
	wallet_path: 'wallet.json',
} as const;

(async () => {
	console.log("=== Transfer Ownership Configuration ===");
	console.log("NTT Manager:", CONFIG.ntt_manager);
	console.log("New Owner:", CONFIG.new_owner_pubkey);
	
	// Load current owner wallet
	const walletJSON = JSON.parse(fs.readFileSync(CONFIG.wallet_path, 'utf-8'));
	const walletKeypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(walletJSON));
	console.log("Current Owner:", walletKeypair.publicKey.toString());

	const connection = new Connection(CONFIG.rpc_endpoint, 'confirmed');
	const newOwnerPubkey = new PublicKey(CONFIG.new_owner_pubkey);

	// Get the NTT program
	const program = getNttProgram(
		connection,
		CONFIG.ntt_manager,
		CONFIG.ntt_version
	);

	// Create the transfer ownership instruction using the SDK
	const transferIx = await NTT.createTransferOwnershipInstruction(program as any, {
		owner: walletKeypair.publicKey,
		newOwner: newOwnerPubkey,
	});

	console.log("\n=== Executing Transfer ===");
	
	// Create and send transaction
	const wallet = new anchor.Wallet(walletKeypair);
	const provider = new anchor.AnchorProvider(connection, wallet, {
		preflightCommitment: 'confirmed',
	});
	
	const tx = await provider.sendAndConfirm(
		new anchor.web3.Transaction().add(transferIx)
	);

	console.log("✓ Transfer successful!");
	console.log("Transaction signature:", tx);
	console.log("\n=== Next Steps ===");
	console.log("The new owner must now claim ownership using claimOwnership.ts");
})();

