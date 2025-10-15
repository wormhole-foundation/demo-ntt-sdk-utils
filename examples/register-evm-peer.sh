#!/bin/bash

# Example: Register a remote EVM chain as peer on local chain (unidirectional)
# Edit the values below and run: ./examples/register-evm-peer.sh

npx ts-node src/evm/evmRegisterPeer.ts \
  --rpc "https://your-endpoint.quiknode.pro/YOUR_API_KEY/" \
  --private-key "0xYOUR_PRIVATE_KEY" \
  --local-manager "0xLOCAL_MANAGER" \
  --local-transceiver "0xLOCAL_TRANSCEIVER" \
  --local-chain Base \
  --remote-chain Ethereum \
  --remote-manager "0xREMOTE_MANAGER" \
  --remote-transceiver "0xREMOTE_TRANSCEIVER" \
  --inbound-limit 1000000000000000000000 \
  --network Mainnet
