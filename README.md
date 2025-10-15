# Wormhole NTT SDK Utils

Utility scripts for Wormhole Native Token Transfer (NTT) operations including peer registration between chains and ownership management.

## Installation

```bash
yarn install
```

## Prerequisites

- Node.js v18+
- RPC endpoints for your chains
- Wallet with gas tokens
- NTT deployment addresses (manager & transceiver)

## Quick Start

All scripts have examples in the [`examples/`](examples/) folder. Edit the values and run them directly:

```bash
# Make scripts executable (first time only)
chmod +x examples/*.sh

# Run any example
./examples/register-evm-peer.sh
./examples/register-evm-to-evm.sh
./examples/register-solana-peer.sh
```

## Scripts

### EVM Peer Registration

| Script | Description | Example |
|--------|-------------|---------|
| `evmRegisterPeer.ts` | Register remote evm chain as peer (unidirectional) | [register-evm-peer.sh](examples/register-evm-peer.sh) |
| `evmRegisterPeerCalldata.ts` | Generate calldata for evm peer registration (governance) | [register-evm-peer-calldata.sh](examples/register-evm-peer-calldata.sh) |
| `evmToEvmPeer.ts` | Bidirectional evm peer registration between EVM chains | [register-evm-to-evm.sh](examples/register-evm-to-evm.sh) |
| `evmToSolanaPeer.ts` | Register Solana as peer on EVM chain | [register-solana-peer.sh](examples/register-solana-peer.sh) |
| `evmToSolanaPeerCalldata.ts` | Generate calldata for Solana peer registration | [register-solana-peer-calldata.sh](examples/register-solana-peer-calldata.sh) |

**Common Parameters:**
- `--rpc`: RPC endpoint URL
- `--private-key`: Wallet private key (must be manager owner)
- `--local-manager` / `--manager`: NTT manager address
- `--local-transceiver` / `--transceiver`: Wormhole transceiver address
- `--local-chain` / `--chain`: Chain name (e.g., `Base`, `Ethereum`, `Sepolia`)
- `--remote-chain`: Remote chain name
- `--remote-manager`: Remote NTT manager address
- `--remote-transceiver`: Remote transceiver address
- `--inbound-limit`: Max receivable tokens in base units
- `--network`: `Mainnet` or `Testnet`

### Solana Ownership Management

**Transfer Ownership:**
1. Edit configuration in `src/solana/transferOwnershipToWallet.ts`
2. Run: `yarn transfer-ownership`

**Claim Ownership:**
1. Edit configuration in `src/solana/claimOwnership.ts`
2. Run: `yarn claim-ownership`


## Repository Structure

```
├── src/
│   ├── evm/                    # EVM chain scripts
│   │   ├── evmRegisterPeer.ts
│   │   ├── evmRegisterPeerCalldata.ts
│   │   ├── evmToEvmPeer.ts
│   │   ├── evmToSolanaPeer.ts
│   │   └── evmToSolanaPeerCalldata.ts
│   └── solana/                 # Solana scripts
│       ├── transferOwnershipToWallet.ts
│       └── claimOwnership.ts
├── examples/                   # example scripts
│   ├── register-evm-peer.sh
│   ├── register-evm-peer-calldata.sh
│   ├── register-evm-to-evm.sh
│   ├── register-solana-peer.sh
│   └── register-solana-peer-calldata.sh
└── package.json
```

## Security Warnings

⚠️ **NEVER commit private keys or wallet files to version control**

- Always test on testnet first
- Verify all addresses before executing
- Use hardware wallets for production
- Keep wallet files outside the project directory
