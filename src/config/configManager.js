import configData from './config.json';

// Determine the current environment
const getEnvironment = () => {
  return process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';
};

// Get the configuration for the current environment
export const getConfig = () => {
  const env = getEnvironment();
  return configData[env] || configData.development;
};

// Get blockchain configuration
export const getBlockchainConfig = () => {
  return getConfig().blockchain;
};

// Get contract addresses
export const getContractAddresses = () => {
  return getConfig().contracts;
};

// Get API configurations
export const getApiConfig = (apiName) => {
  return getConfig().apis[apiName];
};

// Get OpenAI configuration
export const getOpenAIConfig = () => {
  return getApiConfig('openai');
};

// Get IPFS configuration
export const getIpfsConfig = () => {
  return getConfig().ipfs;
};

// Override configuration at runtime (useful for testing or dynamic updates)
export const overrideConfig = (path, value) => {
  const env = getEnvironment();
  const pathParts = path.split('.');
  
  let current = configData[env];
  for (let i = 0; i < pathParts.length - 1; i++) {
    current = current[pathParts[i]];
  }
  
  current[pathParts[pathParts.length - 1]] = value;
  return configData[env];
};
