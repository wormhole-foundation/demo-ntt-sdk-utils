/**
 * Unidirectional Solana to EVM peer registration
 * Registers a remote EVM chain as a peer on the local Solana chain
 * 
 * Usage:
 * npx tsx src/solana/solanaRegisterPeer.ts \
 *   --rpc <solana-rpc-url> \
 *   --private-key <solana-private-key> \
 *   --local-manager <solana-manager-address> \
 *   --local-transceiver <solana-transceiver-address> \
 *   --local-token <solana-token-mint-address> \
 *   --remote-chain <evm-chain-name> \
 *   --remote-manager <evm-manager-address> \
 *   --remote-transceiver <evm-transceiver-address> \
 *   --inbound-limit <inbound-limit> \
 *   --network <Testnet|Mainnet>
 */

import { toUniversal, signSendWait as ssw, Wormhole, contracts } from '@wormhole-foundation/sdk';
import solana from "@wormhole-foundation/sdk/platforms/solana";
import evm from "@wormhole-foundation/sdk/platforms/evm";
import { SolanaNtt } from '@wormhole-foundation/sdk-solana-ntt';
import { Connection, PublicKey } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { encoding } from '@wormhole-foundation/sdk-connect';
import fs from 'fs';

type Args = {
  rpc: string;
  privateKey: string;
  localManager: string;
  localTransceiver: string;
  localToken: string;
  localChain: string;
  remoteChain: string;
  remoteManager: string;
  remoteTransceiver: string;
  inboundLimit: string;
  network: string;
};

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (f: string, req = true) => {
    const i = a.indexOf(f);
    if (i === -1) {
      if (req) throw new Error(`Missing ${f}`);
      return undefined;
    }
    return a[i + 1];
  };

  return {
    rpc: get('--rpc')!,
    privateKey: get('--private-key')!,
    localManager: get('--local-manager')!,
    localTransceiver: get('--local-transceiver')!,
    localToken: get('--local-token')!,
    localChain: get('--local-chain') || 'Solana',
    remoteChain: get('--remote-chain')!,
    remoteManager: get('--remote-manager')!,
    remoteTransceiver: get('--remote-transceiver')!,
    inboundLimit: get('--inbound-limit')!,
    network: get('--network') || 'Testnet',
  };
}

async function main() {
  const args = parseArgs();

  console.log('=== Simple Unidirectional Solana to EVM Peer Registration ===');
  console.log(`Registering ${args.remoteChain} as peer on ${args.localChain}`);
  console.log(`Local Manager: ${args.localManager}`);
  console.log(`Local Transceiver: ${args.localTransceiver}`);
  console.log(`Local Token: ${args.localToken}`);
  console.log(`Remote Manager: ${args.remoteManager}`);
  console.log(`Remote Transceiver: ${args.remoteTransceiver}`);
  console.log(`Inbound Limit: ${args.inboundLimit}`);
  console.log('');

  try {
    // Create Solana connection
    const connection = new Connection(args.rpc, 'confirmed');
    
    // Create Solana NTT instance
    const coreBridgeAddress = contracts.coreBridge(args.network as any, args.localChain as any);
    console.log(`Core Bridge (${args.localChain}): ${coreBridgeAddress}`);
    
    const solanaNtt = new SolanaNtt(
      args.network as any,
      args.localChain as any,
      connection,
      {
        coreBridge: coreBridgeAddress,
        ntt: {
          manager: args.localManager,
          token: args.localToken,
          transceiver: { wormhole: args.localTransceiver },
        }
      }
    );
    
    console.log('Solana NTT instance created');

    // Convert remote chain addresses to ChainAddress format
    const remoteManagerAddress = {
      chain: args.remoteChain,
      address: toUniversal(args.remoteChain as any, args.remoteManager)
    } as any;
    const remoteTransceiverAddress = {
      chain: args.remoteChain,
      address: toUniversal(args.remoteChain as any, args.remoteTransceiver)
    } as any;

    const wh = new Wormhole(args.network as any, [solana.Platform, evm.Platform]);
    const ch = wh.getChain(args.localChain as any);
    
    // Create signer from private key
    // Handle both base58 encoded keys and file paths
    let privateKey: string;
    if (fs.existsSync(args.privateKey)) {
      // If it's a file path, read the keypair
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(args.privateKey, 'utf8')))
      );
      privateKey = encoding.b58.encode(keypair.secretKey);
    } else {
      // Assume it's a base58 encoded private key
      privateKey = args.privateKey;
    }
    
    const signer = await solana.getSigner(
      connection,
      privateKey,
      { debug: false }
    );

    // Check if wormhole transceiver is registered with the NTT manager
    // This is a one-time setup step that must be done before peer registration
    console.log('\n=== Checking Wormhole Transceiver Registration ===');
    const transceiverProgramId = new PublicKey(args.localTransceiver);
    const registeredTransceiverPda = solanaNtt.pdas.registeredTransceiver(transceiverProgramId);
    const registeredTransceiverAccount = await connection.getAccountInfo(registeredTransceiverPda);
    
    if (registeredTransceiverAccount === null) {
      console.log('Wormhole transceiver not registered with NTT manager');
      console.log('Registering wormhole transceiver...');
      
      try {
        const registerTx = solanaNtt.registerWormholeTransceiver({
          payer: signer.address() as any,
          owner: signer.address() as any,
        });
        await ssw(ch, registerTx, signer);
        console.log('Wormhole transceiver registered successfully');
        
        // Wait a moment to ensure transaction is confirmed
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.error('Failed to register wormhole transceiver:', e);
        console.error('Note: The wormhole transceiver must be registered before peer registration can proceed.');
        process.exit(1);
      }
    } else {
      console.log('Wormhole transceiver already registered');
    }

    console.log('\n=== Registering Remote Chain as Peer ===');

    // Register remote manager as peer on local manager
    console.log(`Registering ${args.remoteChain} manager as peer on ${args.localChain} manager...`);
    const setPeerGenerator = solanaNtt.setPeer(
      remoteManagerAddress,
      18, // EVM decimals (usually 18)
      BigInt(args.inboundLimit),
      signer.address()
    );

    console.log('Debug - Generator created, attempting to execute...');

    try {
      await ssw(ch, setPeerGenerator, signer);
      console.log(`${args.remoteChain} manager peer registered successfully`);
      
      // Wait a moment to ensure transaction is confirmed
      console.log('Waiting for transaction confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.error(`${args.remoteChain} manager peer registration failed:`, e);
      process.exit(1);
    }

    // Register remote transceiver as peer on local transceiver
    console.log(`Registering ${args.remoteChain} transceiver as peer on ${args.localChain} transceiver...`);
    const setTransceiverPeerGenerator = solanaNtt.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      remoteTransceiverAddress,
      signer.address()
    );

    try {
      await ssw(ch, setTransceiverPeerGenerator, signer);
      console.log(`${args.remoteChain} transceiver peer registered successfully`);
    } catch (e) {
      console.error(`${args.remoteChain} transceiver peer registration failed:`, e);
      process.exit(1);
    }

    console.log(`\n${args.remoteChain} successfully registered as peer on ${args.localChain}!`);

  } catch (error: any) {
    console.error('Error during peer registration:', error);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});