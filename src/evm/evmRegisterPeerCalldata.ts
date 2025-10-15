/**
 * EVM peer registration calldata generator
 * Generates calldata for governance/multisig execution
 * 
 * See examples/register-evm-peer-calldata.sh for usage
 */

import { toUniversal, contracts } from '@wormhole-foundation/sdk';
import { EvmNtt } from '@wormhole-foundation/sdk-evm-ntt';
import { ethers } from 'ethers';

type Args = {
  rpc: string;
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
    localManager: get('--local-manager')!,
    localTransceiver: get('--local-transceiver')!,
    localChain: get('--local-chain')!,
    remoteChain: get('--remote-chain')!,
    remoteManager: get('--remote-manager')!,
    remoteTransceiver: get('--remote-transceiver')!,
    inboundLimit: get('--inbound-limit')!,
    network: get('--network') || 'Testnet',
  };
}

// Custom function to extract calldata instead of executing
async function extractCalldata(generator: any) {
  try {
    const txData = await generator.next();
    if (!txData.done && txData.value) {
      const tx = txData.value;
      return {
        to: tx.transaction.to,
        data: tx.transaction.data,
        value: tx.transaction.value || '0'
      };
    }
    throw new Error('Generator returned no transaction data');
  } catch (error) {
    throw error;
  }
}

async function main() {
  const args = parseArgs();

  console.log('=== EVM Unidirectional Peer Registration Calldata ===');
  console.log(`Local Chain: ${args.localChain}`);
  console.log(`Local Manager: ${args.localManager}`);
  console.log(`Local Transceiver: ${args.localTransceiver}`);
  console.log(`Remote Chain: ${args.remoteChain}`);
  console.log(`Remote Manager: ${args.remoteManager}`);
  console.log(`Remote Transceiver: ${args.remoteTransceiver}`);
  console.log(`Inbound Limit: ${args.inboundLimit}`);
  console.log('');

  try {
    // Create EVM NTT instance for local chain only
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

    // Convert remote chain addresses to ChainAddress format
    const remoteManagerAddress = {
      chain: args.remoteChain,
      address: toUniversal(args.remoteChain as any, args.remoteManager)
    } as any;
    const remoteTransceiverAddress = {
      chain: args.remoteChain,
      address: toUniversal(args.remoteChain as any, args.remoteTransceiver)
    } as any;

    console.log('=== Generating Calldata ===');

    // Generate calldata for manager peer registration
    console.log(`\n1. Registering ${args.remoteChain} manager as peer on ${args.localChain} manager...`);
    const setPeerGenerator = evmNtt.setPeer(
      remoteManagerAddress,
      18, // EVM decimals (usually 18)
      BigInt(args.inboundLimit)
    );

    const managerCalldata = await extractCalldata(setPeerGenerator);
    console.log(`Manager Target: ${managerCalldata.to}`);
    console.log(`Manager Calldata: ${managerCalldata.data}`);

    // Generate calldata for transceiver peer registration
    console.log(`\n2. Registering ${args.remoteChain} transceiver as peer on ${args.localChain} transceiver...`);
    const setTransceiverPeerGenerator = evmNtt.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      remoteTransceiverAddress
    );

    const transceiverCalldata = await extractCalldata(setTransceiverPeerGenerator);
    console.log(`Transceiver Target: ${transceiverCalldata.to}`);
    console.log(`Transceiver Calldata: ${transceiverCalldata.data}`);

    console.log('\n🎉 Unidirectional peer registration calldata generated successfully!');
    console.log(`\nExecute these transactions on ${args.localChain} to register ${args.remoteChain} as a peer.`);

  } catch (error: any) {
    console.error('❌ Error generating calldata:', error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});




