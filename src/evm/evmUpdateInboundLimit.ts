/**
 * Update inbound limit for an existing peer on an EVM chain
 * This script uses setInboundLimit to update only the inbound limit without re-registering peers
 * 
 * Usage:
 * npx ts-node src/evm/evmUpdateInboundLimit.ts \
 *   --rpc https://base-mainnet.infura.io/v3/YOUR_KEY \
 *   --private-key 0xYOUR_PRIVATE_KEY \
 *   --local-manager 0xYOUR_LOCAL_MANAGER \
 *   --local-transceiver 0xYOUR_LOCAL_TRANSCEIVER \
 *   --local-chain Base \
 *   --remote-chain Solana \
 *   --inbound-limit 184467440737095516150000000000 \
 *   --network Mainnet
 */

import { signSendWait as ssw, Wormhole, contracts } from '@wormhole-foundation/sdk';
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
    inboundLimit: get('--inbound-limit')!,
    network: get('--network') || 'Testnet',
  };
}

async function main() {
  const args = parseArgs();

  console.log(`Updating inbound limit for ${args.remoteChain} on ${args.localChain}`);

  try {
    const coreBridgeAddress = contracts.coreBridge(args.network as any, args.localChain as any);
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

    const wh = new Wormhole(args.network as any, [evm.Platform]);
    const ch = wh.getChain(args.localChain as any);
    const signer = await evm.getSigner(provider, args.privateKey, { debug: false });

    const limit = BigInt(args.inboundLimit);
    const setInboundLimitGenerator = evmNtt.setInboundLimit(
      args.remoteChain as any,
      limit
    );

    const txIds = await ssw(ch, setInboundLimitGenerator, signer);
    console.log(`Transaction hash: ${txIds[0]?.txid || 'N/A'}`);
    console.log(`Inbound limit updated successfully`);

  } catch (error: any) {
    console.error('Error:', error);
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

