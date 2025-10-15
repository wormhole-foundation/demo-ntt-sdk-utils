#!/bin/bash

# Example: Bidirectional EVM-to-EVM peer registration
# Edit the values below and run: ./examples/register-evm-to-evm.sh

npx ts-node src/evm/evmToEvmPeer.ts \
  --rpc-a "https://your-sepolia-endpoint.quiknode.pro/YOUR_API_KEY/" \
  --private-key-a "0xYOUR_PRIVATE_KEY_A" \
  --manager-a "0xMANAGER_A" \
  --transceiver-a "0xTRANSCEIVER_A" \
  --chain-a Sepolia \
  --rpc-b "https://your-arbitrum-endpoint.quiknode.pro/YOUR_API_KEY/" \
  --private-key-b "0xYOUR_PRIVATE_KEY_B" \
  --manager-b "0xMANAGER_B" \
  --transceiver-b "0xTRANSCEIVER_B" \
  --chain-b ArbitrumSepolia \
  --inbound-limit 1000000000000000000000
