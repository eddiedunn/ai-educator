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