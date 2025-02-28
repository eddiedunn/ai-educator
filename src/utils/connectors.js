import { initializeConnector } from '@web3-react/core';
import { MetaMask } from '@web3-react/metamask';
import { BLOCKCHAIN_CONFIG } from '../config';

// Parse chain ID from configuration
const chainId = parseInt(BLOCKCHAIN_CONFIG.chainId, 10);

// Initialize the MetaMask connector
export const [metaMask, metaMaskHooks] = initializeConnector(
  (actions) => new MetaMask({ actions })
);

// Helper function to activate MetaMask connector
export async function activateInjectedConnector() {
  try {
    await metaMask.activate(chainId);
    return true;
  } catch (error) {
    console.error('Failed to activate MetaMask connector:', error);
    return false;
  }
} 