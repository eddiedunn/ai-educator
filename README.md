# AI Educator Platform

A full-stack dApp template with React frontend and Hardhat for smart contract development, featuring role-based access control.

## Quick Start

### Prerequisites
- Node.js
- npm or yarn
- MetaMask browser extension

### Setup

1. **Clone the repository and install dependencies**

```bash
npm install
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

```bash
npm start
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
