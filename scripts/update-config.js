// This script updates the config.js file with deployed contract addresses from a specific network
const fs = require('fs');
const path = require('path');
const { getAddresses } = require('./deployed-addresses');

// Path to the config.js file
const CONFIG_FILE = path.join(__dirname, '../src/config.js');

async function main() {
  // Network is passed as an argument or defaults to localhost
  const network = process.argv[2] || 'localhost';
  console.log(`Updating config.js with addresses from ${network} network...`);
  
  // Get deployed contract addresses
  const addresses = getAddresses(network);
  
  if (!addresses || Object.keys(addresses).length === 0) {
    console.error(`No deployed addresses found for network: ${network}`);
    console.error('Please run the deployment script first.');
    process.exit(1);
  }

  console.log('Found the following contract addresses:');
  console.log(JSON.stringify(addresses, null, 2));
  
  // Read the config.js file
  let configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
  
  // Update CONTRACT_ADDRESSES section
  if (addresses.PuzzlePoints && addresses.QuestionManager) {
    // Create a regular expression to find the CONTRACT_ADDRESSES section
    const contractAddressesPattern = /(export const CONTRACT_ADDRESSES = \{[\s\S]*?)(puzzlePoints:.*?,[\s\S]*?questionManager:.*?)(\s*\};)/;
    
    // Create the replacement string with the new addresses
    const replacement = `$1puzzlePoints: '${addresses.PuzzlePoints}',\n  questionManager: '${addresses.QuestionManager}'$3`;
    
    // Replace the addresses
    configContent = configContent.replace(contractAddressesPattern, replacement);
    
    console.log(`Updated PuzzlePoints address to: ${addresses.PuzzlePoints}`);
    console.log(`Updated QuestionManager address to: ${addresses.QuestionManager}`);
  }
  
  // Update network info if it's not localhost
  if (network !== 'localhost' && network !== 'hardhat') {
    let chainId, rpcUrl, networkName, blockExplorer;
    
    // Configure based on the network
    if (network === 'baseSepoliaTestnet') {
      chainId = '84532';
      rpcUrl = 'https://sepolia.base.org';
      networkName = 'Base Sepolia Testnet';
      blockExplorer = 'https://sepolia.basescan.org';
    }
    // Add more networks as needed
    
    if (chainId && rpcUrl) {
      // Update BLOCKCHAIN_CONFIG section
      const blockchainConfigPattern = /(export const BLOCKCHAIN_CONFIG = \{[\s\S]*?)(chainId:.*?,[\s\S]*?rpcUrl:.*?,[\s\S]*?networkName:.*?,[\s\S]*?blockExplorer:.*?)(\s*,[\s\S]*?\};)/;
      
      const blockchainReplacement = `$1chainId: process.env.REACT_APP_CHAIN_ID || '${chainId}',\n  rpcUrl: process.env.REACT_APP_RPC_URL || '${rpcUrl}',\n  networkName: '${networkName}',\n  blockExplorer: '${blockExplorer}'$3`;
      
      configContent = configContent.replace(blockchainConfigPattern, blockchainReplacement);
      
      console.log(`Updated blockchain configuration for ${networkName}`);
    }
  }
  
  // Write back to the config.js file
  fs.writeFileSync(CONFIG_FILE, configContent);
  console.log(`Updated ${CONFIG_FILE} with deployed contract addresses for ${network}.`);
  
  // If the App.js file also needs updating
  try {
    const APP_FILE = path.join(__dirname, '../src/components/App.js');
    if (fs.existsSync(APP_FILE)) {
      let appContent = fs.readFileSync(APP_FILE, 'utf8');
      
      // Update PuzzlePoints address
      if (addresses.PuzzlePoints) {
        const puzzlePointsPattern = /(const PUZZLE_POINTS_ADDRESS = ')([^']*)(';.*)/s;
        appContent = appContent.replace(
          puzzlePointsPattern,
          `$1${addresses.PuzzlePoints}$3`
        );
      }
      
      // Update QuestionManager address
      if (addresses.QuestionManager) {
        const questionManagerPattern = /(const QUESTION_MANAGER_ADDRESS = ')([^']*)(';.*)/s;
        appContent = appContent.replace(
          questionManagerPattern,
          `$1${addresses.QuestionManager}$3`
        );
      }
      
      // Write back to the App.js file
      fs.writeFileSync(APP_FILE, appContent);
      console.log(`Also updated ${APP_FILE} with deployed contract addresses.`);
    }
  } catch (error) {
    console.warn(`Warning: Unable to update App.js - ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 