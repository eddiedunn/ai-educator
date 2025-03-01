// Configuration options for the application
// This is a temporary solution - in production, use environment variables properly

// OpenAI API configuration
export const OPENAI_CONFIG = {
  // IMPORTANT: Never hardcode real API keys here!
  // This is just a placeholder for development documentation
  apiKey: 'your-api-key-should-be-in-env-file-not-here',
  model: 'gpt-4o-mini',
};

// Blockchain configuration
export const BLOCKCHAIN_CONFIG = {
  chainId: process.env.REACT_APP_CHAIN_ID || '84532',
  rpcUrl: process.env.REACT_APP_RPC_URL || 'https://sepolia.base.org',
  networkName: 'Base Sepolia Testnet',
  blockExplorer: 'https://sepolia.basescan.org',
  currencyName: 'ETH',
  currencySymbol: 'ETH',
  currencyDecimals: 18,
  isTestnet: true
};

// IPFS configuration
export const IPFS_CONFIG = {
  // In development, use simulated IPFS (actually uses localStorage)
  // In production, set this to true to use actual IPFS
  enabled: process.env.REACT_APP_USE_IPFS === 'true',
  
  // For real IPFS implementation
  gateway: process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  
  // When using real IPFS, this would have configuration for the IPFS node
  // This is a placeholder for now
  node: {
    host: process.env.REACT_APP_IPFS_HOST || 'ipfs.infura.io',
    port: process.env.REACT_APP_IPFS_PORT || 5001,
    protocol: process.env.REACT_APP_IPFS_PROTOCOL || 'https',
    apiPath: process.env.REACT_APP_IPFS_API_PATH || '/api/v0',
    projectId: process.env.REACT_APP_IPFS_PROJECT_ID,
    projectSecret: process.env.REACT_APP_IPFS_PROJECT_SECRET
  }
};

// Contract addresses
export const CONTRACT_ADDRESSES = {
  puzzlePoints: '0xf977BB77869eaAF8777aE17995d7d65cd3Cd73A9',
  questionManager: '0x3c1d8Ea0Dc9F856F93C0c3c48FD1CECB6d0251e3'
};

// Test accounts
export const TEST_ACCOUNTS = {
  admin: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  user: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
};

// Application settings
export const APP_SETTINGS = {
  debug: process.env.REACT_APP_ENABLE_DEBUG === 'true'
};

// Get OpenAI API key from environment, falling back to config value
export const getOpenAIApiKey = () => {
  // Try to get from environment first
  const envKey = process.env.REACT_APP_OPENAI_API_KEY;
  if (envKey && envKey.trim() !== '') {
    console.log('Using API key from environment variables');
    return envKey;
  }
  
  // Fall back to warning user that they need to set up their .env file
  console.warn('⚠️ WARNING: No API key found in environment variables. Please add REACT_APP_OPENAI_API_KEY to your .env file');
  return null;
}; 