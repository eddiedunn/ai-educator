#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up your Hackathon Project...${NC}"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Add react-router-dom for navigation
echo -e "${GREEN}Adding react-router-dom for navigation...${NC}"
npm install react-router-dom

# Install cross-env for cross-platform compatibility
echo -e "${GREEN}Installing cross-env for browser selection...${NC}"
npm install --save-dev cross-env

# Compile contracts
echo -e "${GREEN}Compiling smart contracts...${NC}"
npx hardhat compile

# Start a local blockchain in the background
echo -e "${GREEN}Starting a local blockchain...${NC}"

# Detect OS and use appropriate command to open terminal
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npx hardhat node"'
else
    # Linux/other - assuming gnome-terminal
    gnome-terminal -- bash -c "npx hardhat node" &
fi

# Allow node to start up
sleep 5

# Deploy contracts
echo -e "${GREEN}Deploying smart contracts...${NC}"
npx hardhat run scripts/deploy.js --network localhost

# Instructions
echo -e "${BLUE}Setup complete!${NC}"
echo -e "${GREEN}To start the React app in Firefox:${NC}"
echo "npm start"
echo -e "${GREEN}To use a different browser, edit package.json:${NC}"
echo "Change 'cross-env BROWSER=firefox' to your preferred browser"
echo -e "${GREEN}To connect MetaMask:${NC}"
echo "1. Add a network with RPC URL: http://127.0.0.1:8545"
echo "2. Chain ID: 31337"
echo "3. Import a private key from the Hardhat node output"

# Note: You might need to adjust the terminal opening command based on your OS 