# ABI Management Guide

This guide explains how contract ABIs (Application Binary Interfaces) are managed in the AI Educator project.

## What are ABIs?

ABIs (Application Binary Interfaces) are JSON files that describe the interface of a smart contract, including its functions, events, and their parameters. They are essential for your frontend application to interact with your smart contracts.

## How ABIs are Generated and Updated

In this project, ABIs are automatically generated and updated through the following process:

1. **Compilation**: When you run `npm run compile`, Hardhat compiles your smart contracts and generates the ABI files.

2. **ABI Extraction**: After compilation, the `extract-abis` script runs automatically to extract clean ABIs from the compiled artifacts and place them in a dedicated directory.

3. **Frontend Integration**: The extracted ABIs are available for import in your frontend code.

## ABI Locations

- **Raw Artifacts**: `src/abis/contracts/[ContractName].sol/[ContractName].json`
  - These are the full Hardhat artifacts containing ABIs, bytecode, and other metadata.

- **Extracted ABIs**: `src/abis/extracted/[ContractName].json`
  - These are clean ABI-only files for easier import.

- **TypeScript Definitions**: `src/abis/extracted/[ContractName].ts`
  - These provide type-safe ABI constants for TypeScript projects.

## How to Use ABIs in Your Code

### Using Raw Artifacts (Current Method)

```javascript
import ContractArtifact from '../abis/contracts/MyContract.sol/MyContract.json';

// Create contract instance
const contract = new ethers.Contract(
  contractAddress,
  ContractArtifact.abi,
  signer
);
```

### Using Extracted ABIs (Recommended)

```javascript
import MyContractABI from '../abis/extracted/MyContract.json';

// Create contract instance
const contract = new ethers.Contract(
  contractAddress,
  MyContractABI,
  signer
);
```

### Using TypeScript Definitions (For TypeScript Projects)

```typescript
import { MyContractABI } from '../abis/extracted/MyContract';

// Create contract instance with type safety
const contract = new ethers.Contract(
  contractAddress,
  MyContractABI,
  signer
);
```

## Manual ABI Updates

If you need to manually update the ABIs (which should rarely be necessary), you can run:

```bash
npm run extract-abis
```

This will extract the ABIs from the latest compiled artifacts.

## Troubleshooting

If you encounter issues with contract interactions, check the following:

1. **Outdated ABIs**: Ensure you've run `npm run compile` after making changes to your contracts.

2. **Incorrect Imports**: Make sure you're importing the correct ABI file.

3. **Contract Mismatch**: Verify that the ABI you're using matches the deployed contract version.

4. **Network Issues**: Confirm you're connected to the correct network where your contracts are deployed.

## Best Practices

1. **Always compile before deploying**: Run `npm run compile` before any deployment to ensure your ABIs are up to date.

2. **Use TypeScript definitions when possible**: They provide better type safety and autocomplete.

3. **Keep contract interfaces stable**: Avoid changing function signatures in deployed contracts to prevent ABI mismatches.

4. **Version your ABIs**: For production deployments, consider versioning your ABIs alongside your contracts. 