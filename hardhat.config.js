require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require('dotenv').config();

// Get environment variables or use defaults
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/your-api-key";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

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
        auto: false,       // disables auto-mining of every transaction
        interval: 1000     // mines a new block every 5000ms (5 seconds)
      }
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
    // You can add more networks as needed
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
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
};
