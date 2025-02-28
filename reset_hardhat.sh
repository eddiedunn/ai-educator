#!/bin/bash

# Kill any running nodes
pkill -f hardhat

# Clean hardhat artifacts and cache
npx hardhat clean
rm -rf artifacts cache

# Restart node
npx hardhat node