/**
 * EVM-to-Solana peer registration
 * Registers Solana as a peer on an EVM chain
 * 
 * See examples/register-solana-peer.sh for usage
 */

import { toUniversal, signSendWait as ssw, Wormhole, contracts } from '@wormhole-foundation/sdk';
import evm from "@wormhole-foundation/sdk/platforms/evm";
import { EvmNtt } from '@wormhole-foundation/sdk-evm-ntt';
import { ethers } from 'ethers';

// Solana decimals (usually 9)
const SOLANA_DECIMALS = 9;

type Args = {
  rpc: string;
  privateKey: string;
  manager: string;
  transceiver: string;
  solanaManager: string;
  solanaTransceiver: string;
  inboundLimit: string;
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
    manager: get('--manager')!,
    transceiver: get('--transceiver')!,
    solanaManager: get('--solana-manager')!,
    solanaTransceiver: get('--solana-transceiver')!,
    inboundLimit: get('--inbound-limit')!,
  };
}




async function main() {
  const args = parseArgs();

  console.log('=== EVM-side Solana Peer Registration ===');
  console.log(`Manager: ${args.manager}`);
  console.log(`Transceiver: ${args.transceiver}`);
  console.log(`Solana Manager: ${args.solanaManager}`);
  console.log(`Solana Transceiver: ${args.solanaTransceiver}`);
  console.log(`Inbound Limit: ${args.inboundLimit}`);
  console.log('');

  try {
    // Create EVM NTT instance using direct constructor (following Solana script pattern)
    const coreBridgeAddress = contracts.coreBridge('Testnet', 'Sepolia');
    console.log(`Core Bridge Address: ${coreBridgeAddress}`);
    
    // Create provider from RPC URL (following CLI pattern)
    const provider = new ethers.JsonRpcProvider(args.rpc);
    
    const evmNtt = new EvmNtt(
      'Testnet', // network
      'Sepolia', // chain
      provider,
      {
        coreBridge: coreBridgeAddress,
        ntt: {
          manager: args.manager,
          token: '', // not needed for peer registration
          transceiver: { wormhole: args.transceiver },
        }
      }
    );
    
    console.log('✅ EVM NTT instance created with provided configuration');

    // Convert Solana addresses to ChainAddress format (using toUniversal)
    const solanaManagerAddress = {
      chain: 'Solana',
      address: toUniversal('Solana', args.solanaManager)
    } as any;
    const solanaTransceiverAddress = {
      chain: 'Solana', 
      address: toUniversal('Solana', args.solanaTransceiver)
    } as any;


    // Create Wormhole instance and chain context for signSendWait
    const wh = new Wormhole('Testnet', [evm.Platform]);
    const ch = wh.getChain('Sepolia');
    
    // Create a proper EVM signer using the SDK
    const signer = await evm.getSigner(
      provider,
      args.privateKey,
      { debug: false }
    );

    // Register Solana manager as peer on EVM manager
    console.log('Registering Solana manager as peer...');
    const setPeerGenerator = evmNtt.setPeer(
      solanaManagerAddress,
      SOLANA_DECIMALS,
      BigInt(args.inboundLimit)
    );

    try {
      await ssw(ch, setPeerGenerator, signer);
      console.log('✅ Solana manager peer registered successfully');
    } catch (e) {
      console.error('❌ Solana manager peer registration failed:', e);
      process.exit(1);
    }

    // Register Solana transceiver as peer on EVM transceiver
    console.log('Registering Solana transceiver as peer...');
    const setTransceiverPeerGenerator = evmNtt.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      solanaTransceiverAddress
    );

    try {
      await ssw(ch, setTransceiverPeerGenerator, signer);
      console.log('✅ Solana transceiver peer registered successfully');
    } catch (e) {
      console.error('❌ Solana transceiver peer registration failed:', e);
      process.exit(1);
    }

    console.log('🎉 All Solana peer registrations completed successfully!');

  } catch (error: any) {
    console.error('❌ Error during Solana peer registration:', error);
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