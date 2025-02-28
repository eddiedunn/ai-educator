# React Hardhat Template

A full-stack dApp template with React frontend and Hardhat for smart contract development.

## Quick Start

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn
- MetaMask browser extension

### Setup

1. **Clone the repository and install dependencies**

```bash
npm install
# or 
yarn install
```

2. **Start local Hardhat node**

```bash
npx hardhat node
```

3. **Deploy smart contracts to local network**

In a new terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

4. **Start the React application**

In a new terminal:
```bash
npm start
# or
yarn start
```

The application will open in your browser at http://localhost:3000

### Connect MetaMask to Local Hardhat Network

1. Open MetaMask
2. Add a new network with the following details:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Import an account using the private keys provided when you started the Hardhat node

### Project Structure

- `/contracts` - Smart contracts written in Solidity
- `/scripts` - Deployment scripts
- `/src` - React frontend application
  - `/abis` - Contract ABIs
  - `/components` - React components
- `/test` - Smart contract tests

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
