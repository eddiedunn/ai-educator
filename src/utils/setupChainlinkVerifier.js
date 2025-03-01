/**
 * Chainlink Functions Setup Utilities
 * 
 * This file contains functions to help set up and configure Chainlink Functions
 * for answer verification in the AI Educator platform.
 */

import { ethers } from 'ethers';

// Mock evaluation logic for hackathon demo
export const CHAINLINK_EVALUATION_SOURCE = `
// This is the JavaScript source code that Chainlink Functions will execute
// to evaluate the user's answers to a question set.

// Main function that will be called by Chainlink Functions
function evaluateAnswers(questionSetId, answers, metadata) {
  console.log(\`Evaluating answers for question set \${questionSetId}\`);
  
  // In a production environment, this would:
  // 1. Call an LLM API with the questions and answers
  // 2. Evaluate the quality of the answers
  // 3. Provide feedback and scoring
  
  // For hackathon demo, we'll return a passing score (>= 70%)
  const totalQuestions = answers.length;
  const correctAnswers = Math.ceil(totalQuestions * 0.8); // 80% correct
  const score = Math.floor((correctAnswers / totalQuestions) * 100);
  
  const result = {
    passed: score >= 70,
    score: score,
    feedback: "Good job on the assessment! Your answers demonstrate understanding of the key concepts.",
    metrics: {
      technical_accuracy: 85,
      completeness: 75,
      clarity: 80
    }
  };
  
  console.log("Evaluation result:", result);
  return result;
}

// Return Buffer-encoded result for on-chain verification
return Functions.encodeUint256(1); // 1 = passed, 0 = failed
`;

/**
 * Sets up the Chainlink Functions verifier on the question manager contract
 * 
 * @param {Object} provider - The ethers provider
 * @param {string} questionManagerAddress - Address of the QuestionManager contract
 * @param {string} donId - The Chainlink DON ID (Decentralized Oracle Network)
 * @param {string} subscriptionId - The Chainlink Functions subscription ID
 * @param {string} sourceCode - The source code for the Chainlink Functions to execute
 * @returns {Promise<Object>} Setup result with success status and transaction info
 */
export async function setupChainlinkVerifier(
  provider,
  questionManagerAddress,
  donId,
  subscriptionId,
  sourceCode = CHAINLINK_EVALUATION_SOURCE
) {
  console.log(`Setting up Chainlink verifier for contract: ${questionManagerAddress}`);
  console.log(`Using DON ID: ${donId}`);
  console.log(`Using Subscription ID: ${subscriptionId}`);
  
  try {
    const signer = provider.getSigner();
    const account = await signer.getAddress();
    console.log(`Connected account: ${account}`);
    
    // Create contract instance with signer
    const questionManagerAbi = [
      "function owner() view returns (address)",
      "function updateChainlinkConfig(string donId, uint64 subscriptionId) external",
      "function setSourceCode(string sourceCode) external",
      "function isAuthorized(address account) view returns (bool)"
    ];
    
    const questionManager = new ethers.Contract(
      questionManagerAddress,
      questionManagerAbi,
      signer
    );
    
    // Check authorization
    const isAuthorized = await questionManager.isAuthorized(account);
    const isOwner = await questionManager.owner() === account;
    
    if (!isAuthorized && !isOwner) {
      console.error("Account is not authorized to update Chainlink configuration");
      return {
        success: false,
        message: "Account is not authorized to update Chainlink configuration"
      };
    }
    
    // Step 1: Set the source code for the Chainlink Functions
    console.log("Setting Chainlink Functions source code...");
    const sourceCodeTx = await questionManager.setSourceCode(sourceCode);
    await sourceCodeTx.wait();
    console.log(`Source code set! Transaction: ${sourceCodeTx.hash}`);
    
    // Step 2: Update the Chainlink configuration with DON ID and subscription ID
    console.log("Updating Chainlink configuration...");
    const updateConfigTx = await questionManager.updateChainlinkConfig(
      donId,
      subscriptionId
    );
    await updateConfigTx.wait();
    console.log(`Chainlink configuration updated! Transaction: ${updateConfigTx.hash}`);
    
    return {
      success: true,
      message: "Chainlink Functions verifier set up successfully",
      sourceCodeTx: sourceCodeTx.hash,
      configTx: updateConfigTx.hash
    };
  } catch (error) {
    console.error("Error setting up Chainlink verifier:", error);
    return {
      success: false,
      message: `Error setting up Chainlink verifier: ${error.message || error}`,
      error
    };
  }
}

/**
 * Tests the Chainlink Functions verifier integration
 * 
 * @param {Object} provider - The ethers provider
 * @param {string} questionManagerAddress - Address of the QuestionManager contract
 * @param {string} questionSetId - The ID of the question set to test
 * @returns {Promise<Object>} Test result
 */
export async function testChainlinkVerifier(
  provider,
  questionManagerAddress,
  questionSetId = "univ2" // Default question set for testing
) {
  console.log(`Testing Chainlink verifier for question set: ${questionSetId}`);
  
  try {
    const signer = provider.getSigner();
    
    // Create contract instance
    const questionManagerAbi = [
      "function getVerifierStatus() view returns (bool enabled, bool configured, string reason)",
      "function getQuestionSet(string questionSetId) view returns (tuple(string id, string title, string description, bool active, uint256 requiredScore) questionSet)",
      "function requestVerification(string questionSetId, string[] answers, string metadataURI) external returns (uint256)"
    ];
    
    const questionManager = new ethers.Contract(
      questionManagerAddress,
      questionManagerAbi,
      signer
    );
    
    // Check verifier status
    const verifierStatus = await questionManager.getVerifierStatus();
    console.log("Verifier status:", verifierStatus);
    
    if (!verifierStatus.enabled || !verifierStatus.configured) {
      return {
        success: false,
        message: `Chainlink verifier is not properly configured: ${verifierStatus.reason}`,
        status: verifierStatus
      };
    }
    
    // Check if question set exists
    try {
      const questionSet = await questionManager.getQuestionSet(questionSetId);
      console.log("Question set:", questionSet);
      
      if (!questionSet.active) {
        return {
          success: false,
          message: `Question set ${questionSetId} is not active`,
          questionSet
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Question set ${questionSetId} does not exist or cannot be retrieved`,
        error: error.message
      };
    }
    
    // Create test answers - these are mock answers for testing
    const mockAnswers = [
      "This is a test answer for question 1.",
      "This is a test answer for question 2."
    ];
    
    // Request verification
    console.log("Requesting verification with mock answers...");
    const verificationTx = await questionManager.requestVerification(
      questionSetId,
      mockAnswers,
      "ipfs://test-metadata-uri"
    );
    
    const receipt = await verificationTx.wait();
    console.log(`Verification requested! Transaction: ${verificationTx.hash}`);
    
    return {
      success: true,
      message: "Chainlink verification requested successfully. Check the transaction on-chain to see the result.",
      transactionHash: verificationTx.hash,
      receipt
    };
  } catch (error) {
    console.error("Error testing Chainlink verifier:", error);
    return {
      success: false,
      message: `Error testing Chainlink verifier: ${error.message || error}`,
      error
    };
  }
}

/**
 * Gets the current Chainlink setup configuration
 * 
 * @param {Object} provider - The ethers provider
 * @param {string} questionManagerAddress - Address of the QuestionManager contract
 * @returns {Promise<Object>} Current configuration
 */
export async function getChainlinkSetupConfig(provider, questionManagerAddress) {
  try {
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    const network = await provider.getNetwork();
    
    console.log(`Attempting to get Chainlink config from ${questionManagerAddress} on chain ${network.chainId} (${network.name})`);
    console.log(`Using signer: ${signerAddress}`);
    
    // Create contract instance
    const questionManagerAbi = [
      "function getVerifierStatus() view returns (bool enabled, bool configured, string reason)",
      "function chainlinkConfig() view returns (string donId, uint64 subscriptionId)",
      "function sourceCode() view returns (string)"
    ];
    
    const questionManager = new ethers.Contract(
      questionManagerAddress,
      questionManagerAbi,
      signer
    );
    
    // Test if contract exists and is accessible
    try {
      await provider.getCode(questionManagerAddress);
    } catch (codeError) {
      console.error("Error getting contract code:", codeError);
      return {
        success: false,
        message: `Contract not found or not accessible at ${questionManagerAddress}. Make sure you're on the correct network.`,
        error: codeError
      };
    }
    
    // Attempt to get each piece of data individually with specific error handling
    let verifierStatus, chainlinkConfig, sourceCode;
    
    try {
      verifierStatus = await questionManager.getVerifierStatus();
      console.log("Successfully retrieved verifier status:", verifierStatus);
    } catch (verifierError) {
      console.error("Error getting verifier status:", verifierError);
      return {
        success: false,
        message: `Contract doesn't support getVerifierStatus or function reverted: ${verifierError.message}`,
        error: verifierError,
        contractAddress: questionManagerAddress,
        networkInfo: network
      };
    }
    
    try {
      chainlinkConfig = await questionManager.chainlinkConfig();
      console.log("Successfully retrieved chainlink config:", chainlinkConfig);
    } catch (configError) {
      console.error("Error getting chainlink config:", configError);
      return {
        success: false,
        message: `Contract doesn't support chainlinkConfig or function reverted: ${configError.message}`,
        error: configError,
        verifierStatus,
        contractAddress: questionManagerAddress,
        networkInfo: network
      };
    }
    
    try {
      sourceCode = await questionManager.sourceCode();
      console.log("Successfully retrieved source code");
    } catch (sourceError) {
      console.error("Error getting source code:", sourceError);
      return {
        success: false,
        message: `Contract doesn't support sourceCode or function reverted: ${sourceError.message}`,
        error: sourceError,
        verifierStatus,
        chainlinkConfig,
        contractAddress: questionManagerAddress,
        networkInfo: network
      };
    }
    
    return {
      success: true,
      verifierStatus,
      chainlinkConfig,
      sourceCode,
      isConfigured: verifierStatus.configured,
      contractAddress: questionManagerAddress,
      networkInfo: network
    };
  } catch (error) {
    console.error("Error getting Chainlink configuration:", error);
    return {
      success: false,
      message: `Error getting Chainlink configuration: ${error.message || error}`,
      error,
      contractAddress: questionManagerAddress,
      networkInfo: await provider.getNetwork().catch(e => ({ error: e.message }))
    };
  }
}

/**
 * Creates a React component for setting up Chainlink Functions
 * 
 * @param {Object} props - React props including provider and questionManagerAddress
 * @returns {React.Component} Component for setting up Chainlink Functions
 */
export function createChainlinkSetupComponent({ provider, questionManagerAddress }) {
  // This is a placeholder function to guide implementation
  // The actual component should be defined in a separate file: src/components/admin/ChainlinkSetup.js
  console.log("Create a ChainlinkSetup.js component that uses setupChainlinkVerifier, testChainlinkVerifier, and getChainlinkSetupConfig");
  
  return null;
} 