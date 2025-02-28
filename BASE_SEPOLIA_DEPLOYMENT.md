# Deploying to Base Sepolia Testnet

This guide provides step-by-step instructions for deploying the AI Educator platform to the Base Sepolia testnet.

## Prerequisites

1. A wallet with Base Sepolia ETH for gas fees
   - Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)

2. Create a `.env` file with your private key and other configurations:
   ```
   PRIVATE_KEY=your_wallet_private_key_here
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   BASESCAN_API_KEY=your_basescan_api_key_for_verification
   ```

## Deployment Steps

### 1. Install Dependencies

Ensure you have all required dependencies installed:

```bash
npm install
```

### 2. Compile Contracts

Compile the smart contracts:

```bash
npx hardhat compile
```

### 3. Deploy Contracts

Deploy the contracts to Base Sepolia using the dedicated deployment script:

```bash
npx hardhat run scripts/deploy-base-sepolia.js --network baseSepoliaTestnet
```

This script will:
- Deploy the PuzzlePoints token
- Deploy the ChainlinkAnswerVerifier with a placeholder router address
- Deploy the QuestionManager
- Connect contracts by setting appropriate permissions
- Mint initial tokens for testing
- Save the deployed addresses to the `deployments/addresses.json` file

### 4. Update the Frontend Configuration

After deployment, update the frontend configuration with the new contract addresses:

```bash
node scripts/update-config.js baseSepoliaTestnet
```

This updates:
- `src/config.js` with the new contract addresses and network configuration
- `src/components/App.js` with the contract addresses

### 5. Verify Contracts (Optional)

Verify your contracts on BaseScan for transparency:

```bash
# Verify PuzzlePoints contract
npx hardhat verify --network baseSepoliaTestnet <PUZZLE_POINTS_ADDRESS>

# Verify ChainlinkAnswerVerifier contract
npx hardhat verify --network baseSepoliaTestnet <VERIFIER_ADDRESS> <ROUTER_ADDRESS> <DON_ID>

# Verify QuestionManager contract
npx hardhat verify --network baseSepoliaTestnet <QUESTION_MANAGER_ADDRESS> <PUZZLE_POINTS_ADDRESS>
```

Replace the addresses and parameters with those output by the deployment script.

### 6. Set Environment Variables for Frontend

For your React app to connect to Base Sepolia, update your `.env` file with these values:

```
# Required: Set these variables to connect to Base Sepolia
REACT_APP_CHAIN_ID=84532
REACT_APP_RPC_URL=https://sepolia.base.org
REACT_APP_ENABLE_DEBUG=true  # Optional but helpful for debugging
```

Important notes:
- Comment out or remove any conflicting local network settings
- Make sure there are no duplicate environment variables
- The environment variables starting with `REACT_APP_` are used by the frontend
- After changing the `.env` file, restart your React app for changes to take effect
- Admin access is automatically granted to the wallet that deployed the contracts (contract owner)
- All other wallet addresses will automatically be treated as regular users

### 7. Configure MetaMask

1. Open MetaMask and add the Base Sepolia network if you haven't already:
   - Network Name: Base Sepolia Testnet
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer URL: https://sepolia.basescan.org

2. Make sure you have Base Sepolia ETH in your wallet:
   - Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)

3. Select Base Sepolia Testnet as your active network in MetaMask

### 8. Start the Frontend Application

Start the React frontend to interact with the deployed contracts:

```bash
npm start
```

### 9. Verify Frontend Connection

To verify that your frontend is properly connected to Base Sepolia:

1. Open your browser console (F12 or right-click > Inspect > Console)
2. Check that there are no connection errors
3. Look for logs showing successful connection to Base Sepolia network (Chain ID: 84532)
4. Confirm that your contract addresses in the console match those deployed to Base Sepolia

## Testing the Deployment

1. Connect your wallet to the Base Sepolia network in MetaMask
2. Ensure you're using the same account that deployed the contracts (or an account with admin privileges)
3. Navigate to the admin panel to create question sets
4. Test the assessment submission process as a user

## Troubleshooting

If you encounter issues:

1. **Transaction failures**: Check if you have enough Base Sepolia ETH for gas
2. **Contract interaction errors**: Verify that the contract addresses in the frontend match those in `deployments/addresses.json`
3. **Network connection issues**: Ensure your MetaMask is connected to Base Sepolia and that the RPC URL is correct

## Notes on Chainlink Integration

Currently, the ChainlinkAnswerVerifier is deployed with a placeholder router address and DON ID. For full Chainlink Functions integration on Base Sepolia:

1. Get the correct router address for Base Sepolia from Chainlink documentation
2. Create a Chainlink subscription and get your DON ID
3. Update the ChainlinkAnswerVerifier with the correct values using the admin functions

## Additional Resources

- [Base Sepolia Documentation](https://docs.base.org/guides/deploy-smart-contracts)
- [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- [BaseScan Explorer](https://sepolia.basescan.org/) 