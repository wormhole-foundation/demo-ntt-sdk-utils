/**
 * Solana peer registration calldata generator
 * Generates calldata for governance/multisig execution
 * 
 * See examples/register-solana-peer-calldata.sh for usage
 */

import { toUniversal, contracts } from '@wormhole-foundation/sdk';
import { EvmNtt } from '@wormhole-foundation/sdk-evm-ntt';
import { ethers } from 'ethers';

// Solana decimals (usually 9)
const SOLANA_DECIMALS = 9;

type Args = {
  rpc: string;
  manager: string;
  transceiver: string;
  solanaManager: string;
  solanaTransceiver: string;
  inboundLimit: string;
  network: string;
  evmChain: string;
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
    manager: get('--manager')!,
    transceiver: get('--transceiver')!,
    solanaManager: get('--solana-manager')!,
    solanaTransceiver: get('--solana-transceiver')!,
    inboundLimit: get('--inbound-limit')!,
    network: get('--network') || 'Testnet',
    evmChain: get('--evm-chain')!,
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

  try {
    const coreBridgeAddress = contracts.coreBridge(args.network as any, args.evmChain as any);
    const provider = new ethers.JsonRpcProvider(args.rpc);
    
    const evmNtt = new EvmNtt(
      args.network as any,
      args.evmChain as any,
      provider,
      {
        coreBridge: coreBridgeAddress,
        ntt: {
          manager: args.manager,
          token: '',
          transceiver: { wormhole: args.transceiver },
        }
      }
    );

    const solanaManagerAddress = {
      chain: 'Solana',
      address: toUniversal('Solana', args.solanaManager)
    } as any;
    const solanaTransceiverAddress = {
      chain: 'Solana', 
      address: toUniversal('Solana', args.solanaTransceiver)
    } as any;

    // Register Solana manager as peer on EVM manager
    console.log('\n1. Manager Peer Registration Calldata:');
    const setPeerGenerator = evmNtt.setPeer(
      solanaManagerAddress,
      SOLANA_DECIMALS,
      BigInt(args.inboundLimit)
    );

    const managerCalldata = await extractCalldata(setPeerGenerator);
    console.log(`Manager Target: ${managerCalldata.to}`);
    console.log(`Manager Calldata: ${managerCalldata.data}`);
    console.log(`Manager Value: ${managerCalldata.value}`);

    // Register Solana transceiver as peer on EVM transceiver
    console.log('\n2. Transceiver Peer Registration Calldata:');
    const setTransceiverPeerGenerator = evmNtt.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      solanaTransceiverAddress
    );

    const transceiverCalldata = await extractCalldata(setTransceiverPeerGenerator);
    console.log(`Transceiver Target: ${transceiverCalldata.to}`);
    console.log(`Transceiver Calldata: ${transceiverCalldata.data}`);
    console.log(`Transceiver Value: ${transceiverCalldata.value}`);

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

