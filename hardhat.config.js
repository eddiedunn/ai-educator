require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require('dotenv').config();

// Import the task function from Hardhat
const { task } = require("hardhat/config");

// Get environment variables or use defaults
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/your-api-key";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

// Add tasks for Chainlink setup
task("setup-chainlink", "Sets up the connection between QuestionManager and ChainlinkAnswerVerifier")
  .setAction(async function (taskArguments, hre) {
    // Execute the script properly with access to the Hardhat Runtime Environment
    await hre.run('run', { 
      script: './scripts/setup-chainlink-connection.js',
      network: hre.network.name 
    });
  });

task("update-chainlink", "Updates ChainlinkAnswerVerifier with source code and configuration")
  .setAction(async function (taskArguments, hre) {
    // Execute the script properly with access to the Hardhat Runtime Environment
    await hre.run('run', { 
      script: './scripts/update-chainlink-config.js',
      network: hre.network.name
    });
  });

task("deploy-with-chainlink", "Deploys contracts and sets up Chainlink integration")
  .setAction(async function (taskArguments, hre) {
    // Step 1: Deploy the contracts using deploy-with-chainlink.js
    console.log("Step 1: Deploying contracts with Chainlink integration...");
    await hre.run('run', { 
      script: './scripts/deploy-with-chainlink.js',
      network: hre.network.name
    });
    
    console.log("\n✅ Full deployment with Chainlink integration complete!");
  });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
      },
      {
        version: "0.8.19",
      }
    ]
  },
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
      mining: {
        //auto: true,
        auto: false,       // disables auto-mining of every transaction
        interval: 250     // mines a new block every 250 ms
      },
      allowUnlimitedContractSize: true,
      gas: 100000000,
      blockGasLimit: 100000000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      blockConfirmations: 6,
    },
    // Base Sepolia testnet configuration
    baseSepoliaTestnet: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 84532, // Base Sepolia chainId
      blockConfirmations: 6,
      gasPrice: 1000000000, // 1 gwei
      // Optional: You can add verification configuration here
    },
    // You can add more networks as needed
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      baseSepoliaTestnet: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepoliaTestnet",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },
  paths: {
    artifacts: "./src/abis"
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  mocha: {
    timeout: 200000 // 200 seconds max for running tests
  },
  coverage: {
    provider: "hardhat",
    allowUnlimitedContractSize: true,
    gas: 100000000,
    blockGasLimit: 100000000,
    timeout: 600000
  },
};
