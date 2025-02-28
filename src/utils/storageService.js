import { ethers } from 'ethers';
import { APP_SETTINGS, IPFS_CONFIG } from '../config';
import { debugLog } from './debug';

// Storage service configuration is now derived from the app config
const STORAGE_CONFIG = {
  IPFS_ENABLED: IPFS_CONFIG.enabled,
  MOCK_IPFS_DELAY: 500, // Milliseconds to simulate network delay for mock IPFS
};

/**
 * Storage service for question sets and answers
 * Abstracts localStorage and IPFS storage behind a common interface
 */
class StorageService {
  constructor() {
    this.ipfsEnabled = STORAGE_CONFIG.IPFS_ENABLED;
    debugLog(`Storage service initialized with IPFS ${this.ipfsEnabled ? 'enabled' : 'disabled'}`);
    
    if (this.ipfsEnabled && !APP_SETTINGS.debug) {
      // Initialize real IPFS connection when in production with IPFS enabled
      // This is where you would initialize IPFS client libraries
      debugLog('Real IPFS configuration would be initialized here in production');
      this.ipfsConfig = IPFS_CONFIG;
    }
  }

  /**
   * Store a question set
   * @param {Object} questionSet - The question set to store
   * @returns {Promise<Object>} - Object with id, contentHash, and other metadata
   */
  async storeQuestionSet(questionSet) {
    if (this.ipfsEnabled) {
      return this.storeInIPFS(questionSet, 'questionSets');
    } else {
      return this.storeLocally(questionSet, 'questionSets');
    }
  }

  /**
   * Retrieve a question set by ID
   * @param {string} id - Question set ID
   * @returns {Promise<Object>} - The question set object
   */
  async retrieveQuestionSet(id) {
    if (this.ipfsEnabled) {
      return this.retrieveFromIPFS(id, 'questionSets');
    } else {
      return this.retrieveLocally(id, 'questionSets');
    }
  }

  /**
   * Store user answers
   * @param {string} questionSetId - ID of the question set
   * @param {Array} answers - Array of answer objects
   * @returns {Promise<Object>} - Object with uniqueId, answersHash, and timestamp
   */
  async storeAnswers(questionSetId, answers) {
    const answersObj = {
      questionSetId,
      answers,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    if (this.ipfsEnabled) {
      return this.storeInIPFS(answersObj, 'answers');
    } else {
      return this.storeLocally(answersObj, 'answers');
    }
  }

  /**
   * Retrieve answers by ID
   * @param {string} id - Answer set ID or hash
   * @returns {Promise<Object>} - The answers object
   */
  async retrieveAnswers(id) {
    if (this.ipfsEnabled) {
      return this.retrieveFromIPFS(id, 'answers');
    } else {
      return this.retrieveLocally(id, 'answers');
    }
  }

  /**
   * List all stored question sets
   * @returns {Promise<Array>} - Array of question set metadata
   */
  async listQuestionSets() {
    if (this.ipfsEnabled) {
      return this.listFromIPFS('questionSets');
    } else {
      return this.listFromLocalStorage('questionSets');
    }
  }

  /**
   * Delete a question set by ID (only works for localStorage)
   * @param {string} id - Question set ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteQuestionSet(id) {
    if (this.ipfsEnabled) {
      // IPFS content cannot be deleted, but we can remove from our index
      debugLog(`Note: Cannot truly delete from IPFS, only removing from index: ${id}`);
      return this.removeFromIndex('questionSets', id);
    } else {
      return this.deleteLocally('questionSets', id);
    }
  }

  // ----------------------
  // LocalStorage Implementation
  // ----------------------

  /**
   * Store data in localStorage
   * @private
   */
  async storeLocally(data, storageKey) {
    try {
      // Add timestamp if not present
      if (!data.timestamp) {
        data.timestamp = Date.now();
      }
      
      // Generate a contentHash to simulate IPFS hash
      const contentHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(JSON.stringify(data))
      );
      
      // Get current items from storage
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Check if item with same ID exists and update or add
      const existingIndex = items.findIndex(item => item.id === data.id);
      if (existingIndex >= 0) {
        items[existingIndex] = { ...data, contentHash };
      } else {
        items.push({ ...data, contentHash });
      }
      
      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(items));
      
      // Simulate network delay for consistency with IPFS
      await this.simulateNetworkDelay();
      
      return {
        ...data,
        contentHash,
      };
    } catch (error) {
      console.error(`Error storing data in localStorage:`, error);
      throw new Error(`Failed to store data: ${error.message}`);
    }
  }

  /**
   * Retrieve data from localStorage
   * @private
   */
  async retrieveLocally(id, storageKey) {
    try {
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const item = items.find(item => item.id === id);
      
      if (!item) {
        throw new Error(`Item with ID ${id} not found in ${storageKey}`);
      }
      
      // Simulate network delay for consistency with IPFS
      await this.simulateNetworkDelay();
      
      return item;
    } catch (error) {
      console.error(`Error retrieving data from localStorage:`, error);
      throw new Error(`Failed to retrieve data: ${error.message}`);
    }
  }

  /**
   * List items from localStorage
   * @private
   */
  async listFromLocalStorage(storageKey) {
    try {
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Simulate network delay for consistency with IPFS
      await this.simulateNetworkDelay();
      
      return items;
    } catch (error) {
      console.error(`Error listing data from localStorage:`, error);
      throw new Error(`Failed to list data: ${error.message}`);
    }
  }

  /**
   * Delete item from localStorage
   * @private
   */
  async deleteLocally(storageKey, id) {
    try {
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedItems = items.filter(item => item.id !== id);
      
      localStorage.setItem(storageKey, JSON.stringify(updatedItems));
      
      // Simulate network delay for consistency with IPFS
      await this.simulateNetworkDelay();
      
      return true;
    } catch (error) {
      console.error(`Error deleting data from localStorage:`, error);
      throw new Error(`Failed to delete data: ${error.message}`);
    }
  }

  // ----------------------
  // IPFS Implementation
  // ----------------------

  /**
   * Store data in IPFS
   * @private
   */
  async storeInIPFS(data, storageKey) {
    // This would use actual IPFS in production
    // For development, we simulate IPFS interaction
    
    if (!APP_SETTINGS.debug && this.ipfsEnabled) {
      // In production with IPFS enabled, use actual IPFS
      debugLog('Using real IPFS implementation');
      
      try {
        // This is where you would use a real IPFS client library
        // For example:
        // const { cid } = await this.ipfsClient.add(JSON.stringify(data));
        // const contentHash = cid.toString();
        
        // Placeholder implementation - when implementing for real:
        // 1. Install ipfs-http-client: npm install ipfs-http-client
        // 2. Import and use the client here:
        //    import { create } from 'ipfs-http-client';
        //    this.ipfsClient = create({...this.ipfsConfig});
        //    
        // Here's pseudocode for the real implementation:
        // const { cid } = await this.ipfsClient.add(JSON.stringify(data));
        // const contentHash = cid.toString();
        
        // For now, simulate the contentHash
        const contentHash = this.generateMockIPFSHash(data);
        
        // Store metadata in an index
        await this.updateIndex(storageKey, {
          id: data.id,
          contentHash,
          timestamp: data.timestamp,
          questionCount: data.questions ? data.questions.length : undefined
        });
        
        return {
          ...data,
          contentHash,
        };
      } catch (error) {
        console.error('Error storing data in IPFS:', error);
        throw new Error(`Failed to store data in IPFS: ${error.message}`);
      }
    } else {
      // For development, simulate IPFS but still use localStorage
      debugLog(`Simulating IPFS storage for ${storageKey}`);
      
      // Add a timestamp if not present
      if (!data.timestamp) {
        data.timestamp = Date.now();
      }
      
      // Generate a fake IPFS hash (CID)
      const contentHash = this.generateMockIPFSHash(data);
      
      // For the simulation, we're still using localStorage but in a way that mimics IPFS
      // Store the actual data under a key that looks like an IPFS hash
      localStorage.setItem(`ipfs_${contentHash}`, JSON.stringify(data));
      
      // Also keep an index of stored items
      const indexKey = `ipfs_index_${storageKey}`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      
      const indexItem = {
        id: data.id,
        contentHash,
        timestamp: data.timestamp,
        questionCount: data.questions ? data.questions.length : undefined
      };
      
      // Update index
      const existingIndex = index.findIndex(item => item.id === data.id);
      if (existingIndex >= 0) {
        index[existingIndex] = indexItem;
      } else {
        index.push(indexItem);
      }
      
      localStorage.setItem(indexKey, JSON.stringify(index));
      
      // Simulate network delay for IPFS
      await this.simulateNetworkDelay();
      
      return {
        ...data,
        contentHash,
      };
    }
  }

  /**
   * Helper method to update the index of items in storage
   * @private
   */
  async updateIndex(storageKey, indexItem) {
    const indexKey = `ipfs_index_${storageKey}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    const existingIndex = index.findIndex(item => item.id === indexItem.id);
    if (existingIndex >= 0) {
      index[existingIndex] = indexItem;
    } else {
      index.push(indexItem);
    }
    
    localStorage.setItem(indexKey, JSON.stringify(index));
    
    return true;
  }

  /**
   * Retrieve data from IPFS
   * @private
   */
  async retrieveFromIPFS(idOrHash, storageKey) {
    // First, determine if we're looking up by ID or by hash
    let contentHash = idOrHash;
    
    // If it doesn't look like a hash, assume it's an ID and look up the hash
    if (!idOrHash.startsWith('Qm')) {
      // Look up in our index
      const indexKey = `ipfs_index_${storageKey}`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      const indexItem = index.find(item => item.id === idOrHash);
      
      if (!indexItem) {
        throw new Error(`Item with ID ${idOrHash} not found in ${storageKey} index`);
      }
      
      contentHash = indexItem.contentHash;
    }
    
    // Now retrieve the content using the hash
    const content = localStorage.getItem(`ipfs_${contentHash}`);
    
    if (!content) {
      throw new Error(`Content not found for hash ${contentHash}`);
    }
    
    // Simulate network delay for IPFS
    await this.simulateNetworkDelay();
    
    return JSON.parse(content);
  }

  /**
   * List items from IPFS index
   * @private
   */
  async listFromIPFS(storageKey) {
    const indexKey = `ipfs_index_${storageKey}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    // Simulate network delay for IPFS
    await this.simulateNetworkDelay();
    
    return index;
  }

  /**
   * Remove an item from the IPFS index (cannot actually delete from IPFS)
   * @private
   */
  async removeFromIndex(storageKey, id) {
    const indexKey = `ipfs_index_${storageKey}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    const updatedIndex = index.filter(item => item.id !== id);
    localStorage.setItem(indexKey, JSON.stringify(updatedIndex));
    
    // Simulate network delay for IPFS
    await this.simulateNetworkDelay();
    
    return true;
  }

  // ----------------------
  // Helper methods
  // ----------------------

  /**
   * Simulate network delay for consistency between localStorage and IPFS
   * @private
   */
  async simulateNetworkDelay() {
    const delay = STORAGE_CONFIG.MOCK_IPFS_DELAY;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generate a mock IPFS hash (CID)
   * @private
   */
  generateMockIPFSHash(data) {
    // Generate an Ethereum-style hash
    const ethHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(data) + Date.now())
    );
    
    // Convert to a format that looks like an IPFS CIDv1 (starts with Qm)
    // Note: This is just for simulation and would not be a valid IPFS hash
    return 'Qm' + ethHash.substring(2, 44);
  }
}

// Export a singleton instance
export const storageService = new StorageService();

// Also export the class for testing
export default StorageService; 