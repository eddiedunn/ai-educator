# AI Educator Platform

A full-stack dApp template with React frontend and Hardhat for smart contract development, featuring role-based access control.

## Quick Start

### Prerequisites
- Node.js
- npm or yarn
- MetaMask browser extension
- macOS or Linux environment

### Setup

1. **Clone the repository and install dependencies**

```bash
npm install
```

2. **Start local Hardhat node**

```bash
npm run chain
```

3. **Deploy smart contracts to local network and update frontend**

In a new terminal:
```bash
npm run deploy:full
```

4. **Start the React application**

```bash
npm start
```

### One-Command Startup (Recommended)

For the most convenient startup experience, use the provided shell script:

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Start everything with one command
./start.sh
```

This will stop any running processes and start the entire application stack (Hardhat node, contract deployment, and React frontend).

### Available Scripts

- `npm start` - Starts the React application
- `npm run build` - Creates a production build of the React application
- `npm run chain` - Starts a local Hardhat blockchain
- `npm run deploy` - Deploys contracts to the local Hardhat network
- `npm run deploy:testnet` - Deploys contracts to the Sepolia testnet
- `npm run deploy:basesepolia` - Deploys contracts to the Base Sepolia testnet
- `npm run deploy:with-chainlink` - Deploys contracts with Chainlink Functions integration locally
- `npm run deploy:with-chainlink:basesepolia` - Deploys contracts with Chainlink Functions integration to Base Sepolia
- `npm run chainlink:setup` - Sets up the connection between QuestionManager and ChainlinkAnswerVerifier locally
- `npm run chainlink:setup:basesepolia` - Sets up the connection between contracts on Base Sepolia
- `npm run chainlink:update` - Updates ChainlinkAnswerVerifier with source code and configuration locally
- `npm run chainlink:update:basesepolia` - Updates ChainlinkAnswerVerifier on Base Sepolia
- `npm run deploy:full:with-chainlink` - Deploys and sets up everything including Chainlink Functions locally
- `npm run deploy:full:with-chainlink:basesepolia` - Deploys and sets up everything including Chainlink Functions on Base Sepolia
- `npm run verify` - Verifies contract source code on Etherscan (Sepolia)
- `npm run update-frontend` - Updates frontend code with deployed contract addresses
- `npm run deploy:full` - Deploys contracts and updates frontend in one command
- `npm run test:contracts` - Runs tests for the smart contracts
- `npm run test:contracts:watch` - Runs contract tests in watch mode (reruns on file changes)
- `npm run test:contracts:coverage` - Generates a code coverage report for contracts
- `npm run test:contracts:coverage:puzzle` - Generates coverage for PuzzlePoints contract
- `npm run test:contracts:coverage:question` - Generates coverage for QuestionManager contract
- `npm run test:contracts:coverage:chainlink` - Generates coverage for ChainlinkAnswerVerifier contract
- `npm run test:contracts:gas` - Runs contract tests with gas reporting enabled
- `npm run test:puzzle-points` - Runs tests only for the PuzzlePoints contract
- `npm run test:question-manager` - Runs tests only for the QuestionManager contract
- `npm run test:chainlink-verifier` - Runs tests only for the ChainlinkAnswerVerifier contract
- `npm test` - Runs tests for the React application
- `npm run eject` - Ejects the Create React App configuration

### Process Management Scripts

For managing running processes and restarting the application:

- `npm run stop` - Stops any running instances of the app
- `npm run restart` - Stops any running instances and starts the React app
- `npm run restart:chain` - Stops any running instances and starts a new Hardhat node
- `npm run restart:deploy` - Stops any running instances and deploys the contracts
- `npm run restart:deploy:full` - Stops instances and runs full deployment + frontend update
- `npm run restart:all` - One command to start everything fresh (chain, deploy, frontend)

See [RESTART.md](RESTART.md) for detailed documentation on process management.

### Testnet Deployment

To deploy to the Sepolia testnet:

1. Create a `.env` file based on `.env.sample`:
   ```
   cp .env.sample .env
   ```

2. Fill in your:
   - `SEPOLIA_RPC_URL` - Get from Infura or Alchemy
   - `PRIVATE_KEY` - Your wallet's private key
   - `ETHERSCAN_API_KEY` - For contract verification (optional)

3. Make sure you have testnet ETH in your wallet. You can get them from a faucet:
   - [Sepolia Faucet](https://sepoliafaucet.com/)

4. Deploy to testnet and update frontend:
   ```
   npm run deploy:testnet && npm run update-frontend
   ```

5. Verify your contracts (optional):
   ```
   npm run verify <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
   ```

### Connect MetaMask to Local Hardhat Network

1. Open MetaMask
2. Add a new network with the following details:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Import test accounts using the private keys provided when you started the Hardhat node

### Testing User Roles

The application has two roles with different interfaces:

- **Admin Role**: Connect with wallet address `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
- **User Role**: Connect with wallet address `0x70997970c51812dc3a010c7d01b50e0d17dc79c8`

These are the first two accounts provided by the Hardhat node.

### Project Structure

- `/contracts` - Smart contracts written in Solidity
- `/scripts` - Deployment scripts
- `/src` - React frontend application
  - `/abis` - Contract ABIs
  - `/components` - React components
- `/test` - Smart contract tests
- `/deployments` - Contract addresses for different networks

## Testing

### Smart Contract Testing

The project includes a comprehensive test suite for smart contracts. You can run these tests using the following commands:

```bash
# Run all contract tests
npm run test:contracts

# Run tests for specific contracts
npm run test:puzzle-points
npm run test:question-manager
npm run test:chainlink-verifier

# Run tests in watch mode (rerun on file changes)
npm run test:contracts:watch

# Run tests with gas reporting
npm run test:contracts:gas
```

#### Coverage Testing

The project supports code coverage reporting, but due to the complexity of the contracts, there are some limitations:

```bash
# Generate a coverage report (may encounter gas limit issues with complex contracts)
npm run test:contracts:coverage

# Try coverage on specific contracts
npm run test:contracts:coverage:puzzle
npm run test:contracts:coverage:question
npm run test:contracts:coverage:chainlink
```

> **Note:** Coverage testing may encounter gas limit errors due to the instrumentation of code by the coverage tool. This is a known limitation when working with complex smart contracts.

The test files are located in the `/test` directory and use Hardhat's testing framework with Chai assertions.

### React App Testing

For testing the React frontend:

```bash
# Run React tests
npm test
```

## For Hackathon Development

### User/Admin Interface

To implement both user and admin interfaces:

1. Create separate routes in your React application for user and admin views
2. Implement role-based access control in your smart contracts
3. Add authentication to restrict access to admin features

### Backend Integration

For backend services:
1. You can use the Hardhat node as your blockchain backend
2. For additional backend needs, consider adding Express.js in a `/server` directory

Remember to keep it simple given your 48-hour constraint!

## IPFS Storage Configuration

This application includes a storage abstraction layer that can use either browser localStorage (for development) or IPFS (for production). The implementation allows for seamless switching between the two storage methods with a simple configuration change.

### Development Mode (Default)

By default, the application uses a simulated IPFS system that actually stores data in the browser's localStorage. This simulation implements the same interface as the real IPFS implementation, but without external dependencies.

### Production Mode with Real IPFS

To switch to using real IPFS storage:

1. Set the `REACT_APP_USE_IPFS` environment variable to `true` in your `.env` file:
   ```
   REACT_APP_USE_IPFS=true
   ```

2. Configure your IPFS connection by setting the following environment variables:
   ```
   REACT_APP_IPFS_HOST=ipfs.infura.io
   REACT_APP_IPFS_PORT=5001
   REACT_APP_IPFS_PROTOCOL=https
   REACT_APP_IPFS_API_PATH=/api/v0
   REACT_APP_IPFS_PROJECT_ID=your-infura-project-id
   REACT_APP_IPFS_PROJECT_SECRET=your-infura-project-secret
   ```

3. For Infura IPFS, you'll need to sign up for an account and create a project to get your project ID and secret.

### How It Works

The storage service (`src/utils/storageService.js`) provides a consistent interface for storing and retrieving question sets and answers. It automatically handles:

- Content addressing (generating IPFS-compatible hashes)
- Indexing of stored items
- Retrieval by ID or content hash

This abstraction ensures that your application code doesn't need to change when switching between development and production storage methods.

## Chainlink Functions Integration

This project includes integration with Chainlink Functions for decentralized answer verification. For detailed instructions on setting up and using Chainlink Functions with this project, please refer to the dedicated documentation:

### [Chainlink Functions Setup Guide](README-CHAINLINK.md)

### Chainlink Integration Scripts

The following scripts are available for Chainlink Functions integration:

- `npm run deploy:with-chainlink:basesepolia` - Deploys all contracts to Base Sepolia with Chainlink Functions integration
- `npm run chainlink:setup:basesepolia` - Sets up the connection between QuestionManager and ChainlinkAnswerVerifier
- `npm run chainlink:update:basesepolia` - Updates the ChainlinkAnswerVerifier with source code and configuration

You can also run these tasks directly through Hardhat:

```bash
# Setup the connection between QuestionManager and ChainlinkAnswerVerifier
npx hardhat setup-chainlink --network baseSepoliaTestnet

# Update ChainlinkAnswerVerifier with source code and configuration
npx hardhat update-chainlink --network baseSepoliaTestnet

# Deploy contracts and set up Chainlink integration in one command
npx hardhat deploy-with-chainlink --network baseSepoliaTestnet
```

### Chainlink Functions Configuration

Before using Chainlink Functions, you need to set the following environment variables in your `.env` file:

```
# Chainlink Functions Configuration
CHAINLINK_DON_ID=fun-base-sepolia
CHAINLINK_SUBSCRIPTION_ID=your-subscription-id
```

For more information on creating a Chainlink Functions subscription and adding your contract as a consumer, see the [Chainlink Functions Setup Guide](README-CHAINLINK.md).

