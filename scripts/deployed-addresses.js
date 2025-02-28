// This script helps to read and write contract addresses after deployment
const fs = require('fs');
const path = require('path');

// Path to the addresses JSON file
const ADDRESSES_FILE = path.join(__dirname, '../deployments/addresses.json');

// Ensure the deployments directory exists
function ensureDirectoryExists() {
  const dir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(ADDRESSES_FILE)) {
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify({}, null, 2));
  }
}

// Save deployed addresses to file
function saveAddresses(network, addresses) {
  ensureDirectoryExists();
  
  let data = {};
  
  try {
    const fileContent = fs.readFileSync(ADDRESSES_FILE, 'utf8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.warn("Could not read addresses file, creating new one");
    data = {};
  }
  
  data[network] = addresses;
  
  fs.writeFileSync(
    ADDRESSES_FILE,
    JSON.stringify(data, null, 2)
  );
  
  console.log(`Addresses saved to ${ADDRESSES_FILE}`);
}

// Read deployed addresses from file
function getAddresses(network) {
  ensureDirectoryExists();
  
  try {
    const fileContent = fs.readFileSync(ADDRESSES_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    return data[network] || {};
  } catch (error) {
    console.warn("Could not read addresses file");
    return {};
  }
}

module.exports = {
  saveAddresses,
  getAddresses
}; 