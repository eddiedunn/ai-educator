/**
 * Network explorer URL configuration
 * Maps blockchain network IDs to their respective block explorer address URL formats
 */

export const EXPLORER_URLS = {
  // Ethereum Mainnet
  1: {
    name: 'Ethereum Mainnet',
    addressUrl: 'https://etherscan.io/address/',
    txUrl: 'https://etherscan.io/tx/'
  },
  // Ethereum Sepolia Testnet
  11155111: {
    name: 'Ethereum Sepolia',
    addressUrl: 'https://sepolia.etherscan.io/address/',
    txUrl: 'https://sepolia.etherscan.io/tx/'
  },
  // Base Mainnet
  8453: {
    name: 'Base',
    addressUrl: 'https://basescan.org/address/',
    txUrl: 'https://basescan.org/tx/'
  },
  // Base Sepolia Testnet
  84532: { 
    name: 'Base Sepolia',
    addressUrl: 'https://sepolia.basescan.org/address/',
    txUrl: 'https://sepolia.basescan.org/tx/'
  }
};

/**
 * Returns the appropriate explorer URL for the given address based on network ID
 * @param {string} address - The blockchain address
 * @param {number} networkId - The network ID (chain ID)
 * @returns {string|null} - The explorer URL or null if network not supported
 */
export const getAddressExplorerUrl = (address, networkId) => {
  if (!address || !networkId || !EXPLORER_URLS[networkId]) {
    return null;
  }
  
  return EXPLORER_URLS[networkId].addressUrl + address;
};

/**
 * Returns the appropriate explorer URL for the given transaction hash based on network ID
 * @param {string} txHash - The transaction hash
 * @param {number} networkId - The network ID (chain ID)
 * @returns {string|null} - The explorer URL or null if network not supported
 */
export const getTxExplorerUrl = (txHash, networkId) => {
  if (!txHash || !networkId || !EXPLORER_URLS[networkId]) {
    return null;
  }
  
  return EXPLORER_URLS[networkId].txUrl + txHash;
};

/**
 * Returns the network name based on network ID
 * @param {number} networkId - The network ID (chain ID)
 * @returns {string} - The network name or "Unknown Network" if not found
 */
export const getNetworkName = (networkId) => {
  return (networkId && EXPLORER_URLS[networkId])
    ? EXPLORER_URLS[networkId].name
    : "Unknown Network";
}; 