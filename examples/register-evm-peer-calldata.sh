#!/bin/bash

# Example: Generate calldata for EVM peer registration (for governance)
# Edit the values below and run: ./examples/register-evm-peer-calldata.sh

npx ts-node src/evm/evmRegisterPeerCalldata.ts \
  --rpc "https://your-endpoint.quiknode.pro/YOUR_API_KEY/" \
  --local-manager "0xLOCAL_MANAGER" \
  --local-transceiver "0xLOCAL_TRANSCEIVER" \
  --local-chain Base \
  --remote-chain Ethereum \
  --remote-manager "0xREMOTE_MANAGER" \
  --remote-transceiver "0xREMOTE_TRANSCEIVER" \
  --inbound-limit 1000000000000000000000 \
  --network Mainnet

