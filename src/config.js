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
  chainId: process.env.REACT_APP_CHAIN_ID || '31337',
  rpcUrl: process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545',
  networkName: 'Hardhat Network',
  blockExplorer: '',
  currencyName: 'ETH',
  currencySymbol: 'ETH',
  currencyDecimals: 18,
  isTestnet: true
};

// Contract addresses
export const CONTRACT_ADDRESSES = {
  puzzlePoints: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  questionManager: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
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