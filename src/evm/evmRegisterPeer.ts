/**
 * Unidirectional EVM peer registration
 * Registers a remote chain as a peer on the local chain
 * 
 * See examples/register-evm-peer.sh for usage
 */

import { toUniversal, signSendWait as ssw, Wormhole, contracts } from '@wormhole-foundation/sdk';
import evm from "@wormhole-foundation/sdk/platforms/evm";
import { EvmNtt } from '@wormhole-foundation/sdk-evm-ntt';
import { ethers } from 'ethers';

type Args = {
  rpc: string;
  privateKey: string;
  localManager: string;
  localTransceiver: string;
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
    localChain: get('--local-chain') || 'ArbitrumSepolia',
    remoteChain: get('--remote-chain')!,
    remoteManager: get('--remote-manager')!,
    remoteTransceiver: get('--remote-transceiver')!,
    inboundLimit: get('--inbound-limit')!,
    network: get('--network') || 'Testnet',
  };
}

async function main() {
  const args = parseArgs();

  console.log('=== Simple Unidirectional EVM Peer Registration ===');
  console.log(`Registering ${args.remoteChain} as peer on ${args.localChain}`);
  console.log(`Local Manager: ${args.localManager}`);
  console.log(`Local Transceiver: ${args.localTransceiver}`);
  console.log(`Remote Manager: ${args.remoteManager}`);
  console.log(`Remote Transceiver: ${args.remoteTransceiver}`);
  console.log(`Inbound Limit: ${args.inboundLimit}`);
  console.log('');

  try {
    // Create EVM NTT instance for local chain
    const coreBridgeAddress = contracts.coreBridge(args.network as any, args.localChain as any);
    console.log(`Core Bridge (${args.localChain}): ${coreBridgeAddress}`);
    
    const provider = new ethers.JsonRpcProvider(args.rpc);
    
    const evmNtt = new EvmNtt(
      args.network as any,
      args.localChain as any,
      provider,
      {
        coreBridge: coreBridgeAddress,
        ntt: {
          manager: args.localManager,
          token: '',
          transceiver: { wormhole: args.localTransceiver },
        }
      }
    );
    
    console.log('✅ EVM NTT instance created');

    // Convert remote chain addresses to ChainAddress format
    const remoteManagerAddress = {
      chain: args.remoteChain,
      address: toUniversal(args.remoteChain as any, args.remoteManager)
    } as any;
    const remoteTransceiverAddress = {
      chain: args.remoteChain,
      address: toUniversal(args.remoteChain as any, args.remoteTransceiver)
    } as any;

    console.log('Debug - Remote Manager Address:', JSON.stringify(remoteManagerAddress, null, 2));
    console.log('Debug - Remote Transceiver Address:', JSON.stringify(remoteTransceiverAddress, null, 2));

    // Create Wormhole instance and chain context
    const wh = new Wormhole(args.network as any, [evm.Platform]);
    const ch = wh.getChain(args.localChain as any);
    
    // Create signer
    const signer = await evm.getSigner(
      provider,
      args.privateKey,
      { debug: false }
    );

    console.log('\n=== Registering Remote Chain as Peer ===');

    // Register remote manager as peer on local manager
    console.log(`Registering ${args.remoteChain} manager as peer on ${args.localChain} manager...`);
    const setPeerGenerator = evmNtt.setPeer(
      remoteManagerAddress,
      18, // EVM decimals (usually 18)
      BigInt(args.inboundLimit)
    );

    console.log('Debug - Generator created, attempting to execute...');

    try {
      await ssw(ch, setPeerGenerator, signer);
      console.log(`✅ ${args.remoteChain} manager peer registered successfully`);
      
      // Wait a moment to ensure nonce is properly updated before next transaction
      // This helps avoid "replacement fee too low" errors
      console.log('Waiting for nonce update...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.error(`❌ ${args.remoteChain} manager peer registration failed:`, e);
      process.exit(1);
    }

    // Register remote transceiver as peer on local transceiver
    console.log(`Registering ${args.remoteChain} transceiver as peer on ${args.localChain} transceiver...`);
    const setTransceiverPeerGenerator = evmNtt.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      remoteTransceiverAddress
    );

    try {
      await ssw(ch, setTransceiverPeerGenerator, signer);
      console.log(`✅ ${args.remoteChain} transceiver peer registered successfully`);
    } catch (e) {
      console.error(`❌ ${args.remoteChain} transceiver peer registration failed:`, e);
      process.exit(1);
    }

    console.log(`\n🎉 ${args.remoteChain} successfully registered as peer on ${args.localChain}!`);

  } catch (error: any) {
    console.error('❌ Error during peer registration:', error);
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
