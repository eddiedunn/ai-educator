#!/bin/bash

npx hardhat compile
npx hardhat run scripts/deploy-ai-educator.js --network localhost