#!/bin/bash

# Example: Generate calldata for Solana peer registration (for governance)
# Edit the values below and run: ./examples/register-solana-peer-calldata.sh

npx ts-node src/evm/evmToSolanaPeerCalldata.ts \
  --rpc "https://your-endpoint.quiknode.pro/YOUR_API_KEY/" \
  --manager "0xEVM_MANAGER" \
  --transceiver "0xEVM_TRANSCEIVER" \
  --evm-chain HyperEVM \
  --solana-manager "BASE58_SOLANA_MANAGER" \
  --solana-transceiver "BASE58_SOLANA_TRANSCEIVER" \
  --inbound-limit 1000000000000000000000 \
  --network Mainnet

