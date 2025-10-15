#!/bin/bash

# Example: Register Solana as peer on EVM chain
# Edit the values below and run: ./examples/register-solana-peer.sh

npx ts-node src/evm/evmToSolanaPeer.ts \
  --rpc "https://your-endpoint.quiknode.pro/YOUR_API_KEY/" \
  --private-key "0xYOUR_PRIVATE_KEY" \
  --manager "0xEVM_MANAGER" \
  --transceiver "0xEVM_TRANSCEIVER" \
  --solana-manager "BASE58_SOLANA_MANAGER" \
  --solana-transceiver "BASE58_SOLANA_TRANSCEIVER" \
  --inbound-limit 1000000000000000000000
