/**
 * Bidirectional EVM peer registration
 * Registers two EVM chains as peers with each other
 * 
 * See examples/register-evm-to-evm.sh for usage
 */

import { toUniversal, signSendWait as ssw, Wormhole, contracts } from '@wormhole-foundation/sdk';
import evm from "@wormhole-foundation/sdk/platforms/evm";
import { EvmNtt } from '@wormhole-foundation/sdk-evm-ntt';
import { ethers } from 'ethers';

type Args = {
  rpcA: string;
  privateKeyA: string;
  managerA: string;
  transceiverA: string;
  chainA: string;
  rpcB: string;
  privateKeyB: string;
  managerB: string;
  transceiverB: string;
  chainB: string;
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
    rpcA: get('--rpc-a')!,
    privateKeyA: get('--private-key-a')!,
    managerA: get('--manager-a')!,
    transceiverA: get('--transceiver-a')!,
    chainA: get('--chain-a') || 'Sepolia',
    rpcB: get('--rpc-b')!,
    privateKeyB: get('--private-key-b')!,
    managerB: get('--manager-b')!,
    transceiverB: get('--transceiver-b')!,
    chainB: get('--chain-b') || 'ArbitrumSepolia',
    inboundLimit: get('--inbound-limit')!,
  };
}

async function main() {
  const args = parseArgs();

  console.log('=== EVM-to-EVM Peer Registration ===');
  console.log(`Chain A: ${args.chainA}`);
  console.log(`Manager A: ${args.managerA}`);
  console.log(`Transceiver A: ${args.transceiverA}`);
  console.log(`Chain B: ${args.chainB}`);
  console.log(`Manager B: ${args.managerB}`);
  console.log(`Transceiver B: ${args.transceiverB}`);
  console.log(`Inbound Limit: ${args.inboundLimit}`);
  console.log('');

  try {
    // Create EVM NTT instances for both chains
    const coreBridgeAddressA = contracts.coreBridge('Testnet', args.chainA as any);
    const coreBridgeAddressB = contracts.coreBridge('Testnet', args.chainB as any);
    
    console.log(`Core Bridge A (${args.chainA}): ${coreBridgeAddressA}`);
    console.log(`Core Bridge B (${args.chainB}): ${coreBridgeAddressB}`);
    
    const providerA = new ethers.JsonRpcProvider(args.rpcA);
    const providerB = new ethers.JsonRpcProvider(args.rpcB);
    
    const evmNttA = new EvmNtt(
      'Testnet',
      args.chainA as any,
      providerA,
      {
        coreBridge: coreBridgeAddressA,
        ntt: {
          manager: args.managerA,
          token: '',
          transceiver: { wormhole: args.transceiverA },
        }
      }
    );

    const evmNttB = new EvmNtt(
      'Testnet',
      args.chainB as any,
      providerB,
      {
        coreBridge: coreBridgeAddressB,
        ntt: {
          manager: args.managerB,
          token: '',
          transceiver: { wormhole: args.transceiverB },
        }
      }
    );
    
    console.log('✅ EVM NTT instances created for both chains');

    // Convert EVM addresses to ChainAddress format
    const chainBManagerAddress = {
      chain: args.chainB,
      address: toUniversal(args.chainB as any, args.managerB)
    } as any;
    const chainBTransceiverAddress = {
      chain: args.chainB,
      address: toUniversal(args.chainB as any, args.transceiverB)
    } as any;

    const chainAManagerAddress = {
      chain: args.chainA,
      address: toUniversal(args.chainA as any, args.managerA)
    } as any;
    const chainATransceiverAddress = {
      chain: args.chainA,
      address: toUniversal(args.chainA as any, args.transceiverA)
    } as any;

    // Create Wormhole instance and chain contexts
    const wh = new Wormhole('Testnet', [evm.Platform]);
    const chA = wh.getChain(args.chainA as any);
    const chB = wh.getChain(args.chainB as any);
    
    // Create signers for both chains
    const signerA = await evm.getSigner(
      providerA,
      args.privateKeyA,
      { debug: false }
    );
    const signerB = await evm.getSigner(
      providerB,
      args.privateKeyB,
      { debug: false }
    );

    console.log('\n=== Registering Chain B as peer on Chain A ===');

    // Register Chain B manager as peer on Chain A manager
    console.log('Registering Chain B manager as peer on Chain A manager...');
    const setPeerGeneratorA = evmNttA.setPeer(
      chainBManagerAddress,
      18, // EVM decimals (usually 18)
      BigInt(args.inboundLimit)
    );

    try {
      await ssw(chA, setPeerGeneratorA, signerA);
      console.log('✅ Chain B manager peer registered on Chain A successfully');
    } catch (e) {
      console.error('❌ Chain B manager peer registration on Chain A failed:', e);
      process.exit(1);
    }

    // Register Chain B transceiver as peer on Chain A transceiver
    console.log('Registering Chain B transceiver as peer on Chain A transceiver...');
    const setTransceiverPeerGeneratorA = evmNttA.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      chainBTransceiverAddress
    );

    try {
      await ssw(chA, setTransceiverPeerGeneratorA, signerA);
      console.log('✅ Chain B transceiver peer registered on Chain A successfully');
    } catch (e) {
      console.error('❌ Chain B transceiver peer registration on Chain A failed:', e);
      process.exit(1);
    }

    console.log('\n=== Registering Chain A as peer on Chain B ===');

    // Register Chain A manager as peer on Chain B manager
    console.log('Registering Chain A manager as peer on Chain B manager...');
    const setPeerGeneratorB = evmNttB.setPeer(
      chainAManagerAddress,
      18, // EVM decimals (usually 18)
      BigInt(args.inboundLimit)
    );

    try {
      await ssw(chB, setPeerGeneratorB, signerB);
      console.log('✅ Chain A manager peer registered on Chain B successfully');
    } catch (e) {
      console.error('❌ Chain A manager peer registration on Chain B failed:', e);
      process.exit(1);
    }

    // Register Chain A transceiver as peer on Chain B transceiver
    console.log('Registering Chain A transceiver as peer on Chain B transceiver...');
    const setTransceiverPeerGeneratorB = evmNttB.setTransceiverPeer(
      0, // transceiver index (0 for wormhole)
      chainATransceiverAddress
    );

    try {
      await ssw(chB, setTransceiverPeerGeneratorB, signerB);
      console.log('✅ Chain A transceiver peer registered on Chain B successfully');
    } catch (e) {
      console.error('❌ Chain B transceiver peer registration on Chain B failed:', e);
      process.exit(1);
    }

    console.log('\n🎉 All EVM-to-EVM peer registrations completed successfully!');

  } catch (error: any) {
    console.error('❌ Error during EVM-to-EVM peer registration:', error);
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
