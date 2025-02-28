// This script updates the front-end with the deployed contract addresses
const fs = require('fs');
const path = require('path');
const { getAddresses } = require('./deployed-addresses');

// Path to the App.js file
const APP_FILE = path.join(__dirname, '../src/components/App.js');

async function main() {
  // Determine the network to use
  const network = process.env.HARDHAT_NETWORK || 'localhost';
  console.log(`Updating frontend with addresses from ${network} network...`);
  
  // Get deployed contract addresses
  const addresses = getAddresses(network);
  
  if (!addresses || Object.keys(addresses).length === 0) {
    console.error(`No deployed addresses found for network: ${network}`);
    console.error('Please run the deployment script first.');
    process.exit(1);
  }

  console.log('Found the following contract addresses:');
  console.log(JSON.stringify(addresses, null, 2));
  
  // Read the App.js file
  let appContent = fs.readFileSync(APP_FILE, 'utf8');
  
  // Update PuzzlePoints address
  if (addresses.PuzzlePoints) {
    const puzzlePointsPattern = /(const PUZZLE_POINTS_ADDRESS = ')([^']*)(';.*)/s;
    appContent = appContent.replace(
      puzzlePointsPattern,
      `$1${addresses.PuzzlePoints}$3`
    );
    console.log(`Updated PuzzlePoints address to: ${addresses.PuzzlePoints}`);
  }
  
  // Write back to the App.js file
  fs.writeFileSync(APP_FILE, appContent);
  console.log(`Updated ${APP_FILE} with deployed contract addresses.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 