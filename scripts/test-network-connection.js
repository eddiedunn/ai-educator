// Script to test connection to Base Sepolia and check wallet status
const { ethers, config } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("Testing network connection...");
  
  // Get the network from command line or default to baseSepoliaTestnet
  const networkName = process.argv[2] || "baseSepoliaTestnet";
  console.log(`Target network: ${networkName}`);

  try {
    // Get the network configuration from Hardhat
    const network = config.networks[networkName];
    
    if (!network) {
      console.error(`Network ${networkName} not found in your Hardhat config!`);
      console.error("Please check your hardhat.config.js file.");
      process.exit(1);
    }
    
    console.log("Network configuration:");
    console.log(`- URL: ${network.url}`);
    console.log(`- Chain ID: ${network.chainId}`);
    
    // Create a provider
    const provider = new ethers.providers.JsonRpcProvider(network.url);
    
    // Get network info
    const netInfo = await provider.getNetwork();
    console.log("\nNetwork information from provider:");
    console.log(`- Name: ${netInfo.name}`);
    console.log(`- Chain ID: ${netInfo.chainId}`);
    
    // Get latest block
    const latestBlock = await provider.getBlock("latest");
    console.log("\nLatest block information:");
    console.log(`- Block Number: ${latestBlock.number}`);
    console.log(`- Timestamp: ${new Date(latestBlock.timestamp * 1000).toLocaleString()}`);
    console.log(`- Hash: ${latestBlock.hash}`);
    
    // Check wallet status
    const [deployer] = await ethers.getSigners();
    const address = await deployer.getAddress();
    const balance = await provider.getBalance(address);
    
    console.log("\nWallet information:");
    console.log(`- Address: ${address}`);
    console.log(`- Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    if (balance.eq(0)) {
      console.warn("⚠️ WARNING: Your wallet has 0 ETH. You won't be able to deploy contracts or send transactions.");
      console.warn("Please get some testnet ETH from a faucet:");
      console.warn("https://www.coinbase.com/faucets/base-sepolia-faucet");
    } else if (balance.lt(ethers.utils.parseEther("0.1"))) {
      console.warn("⚠️ WARNING: Your wallet has less than 0.1 ETH. This might not be enough for deploying all contracts.");
    } else {
      console.log("✅ Your wallet has sufficient funds for deployment.");
    }
    
    // Check gas price
    const gasPrice = await provider.getGasPrice();
    console.log(`\nCurrent gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`);
    
    // Test a simple contract call to verify the network is functioning
    try {
      const code = await provider.getCode("0x0000000000000000000000000000000000000000");
      console.log("\n✅ Successfully connected to the network and made a test call!");
    } catch (error) {
      console.error("\n❌ Failed to make a test call to the network:");
      console.error(error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n❌ Failed to connect to the network:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 