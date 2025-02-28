// Utility functions for handling answer storage and retrieval
// For a real deployment, this would use IPFS or another decentralized storage
// For now, we'll simulate storage using localStorage

import { ethers } from 'ethers';
import { debugLog } from './debug';

// Store answers in IPFS and return the content hash
// In a real implementation, this would upload to IPFS
// For now, we'll just store in localStorage and generate a mock hash
export const storeAnswers = async (questionSetId, answers) => {
  try {
    // Format the answers object
    const answersObj = {
      questionSetId,
      answers,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    // Generate a unique ID for the answer set
    const uniqueId = `answers_${questionSetId}_${Date.now()}`;
    const answersJson = JSON.stringify(answersObj);
    
    // In a real implementation, we would store this in IPFS
    // For now, store in localStorage
    localStorage.setItem(uniqueId, answersJson);
    
    // Generate a hash of the answers
    // In a real implementation, this would be the IPFS content hash
    const answersHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(answersJson)
    );
    
    debugLog(`Stored answers for question set ${questionSetId} with hash: ${answersHash}`);
    debugLog('Answers:', answersObj);
    
    return {
      uniqueId,
      answersHash,
      timestamp: answersObj.timestamp
    };
  } catch (error) {
    console.error('Error storing answers:', error);
    throw new Error(`Failed to store answers: ${error.message}`);
  }
};

// Retrieve answers from storage using the unique ID
export const retrieveAnswers = async (uniqueId) => {
  try {
    // In a real implementation, this would fetch from IPFS
    // For now, we'll retrieve from localStorage
    const answersJson = localStorage.getItem(uniqueId);
    
    if (!answersJson) {
      throw new Error(`Answers with ID ${uniqueId} not found`);
    }
    
    return JSON.parse(answersJson);
  } catch (error) {
    console.error('Error retrieving answers:', error);
    throw new Error(`Failed to retrieve answers: ${error.message}`);
  }
};

// Retrieve question set content
// In a real implementation, this would fetch from IPFS
export const retrieveQuestionSet = async (questionSetId) => {
  try {
    // For now, we'll create mock questions based on the ID
    const mockQuestions = [];
    const topics = [
      'blockchain consensus mechanisms',
      'smart contract security',
      'decentralized finance (DeFi)',
      'non-fungible tokens (NFTs)',
      'layer 2 scaling solutions',
      'Web3 architecture',
      'token economics',
      'decentralized autonomous organizations (DAOs)',
      'zero-knowledge proofs',
      'cross-chain interoperability'
    ];
    
    // Create questions based on the question set ID
    // Ensure we generate at least 5 questions regardless of the ID
    const questionCount = Math.max(5, parseInt(questionSetId) % 10 || 5);
    debugLog(`Generating ${questionCount} questions for question set ${questionSetId}`);
    
    for (let i = 0; i < questionCount; i++) {
      mockQuestions.push({
        id: i,
        text: `Question ${i + 1}: Explain the concept of ${topics[i % topics.length]} in your own words.`,
        type: 'free-text'
      });
    }
    
    // Create the full question set object
    const questionSet = {
      id: questionSetId,
      title: `Assessment ${questionSetId}`,
      description: 'Answer all questions to demonstrate your understanding of blockchain concepts.',
      instructions: 'Provide detailed, thoughtful responses to each question using your own words.',
      questions: mockQuestions,
      timestamp: new Date().toISOString()
    };
    
    // Hash the question set for verification
    const contentHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(questionSet))
    );
    
    debugLog(`Generated question set with ${mockQuestions.length} questions`);
    return {
      questionSet,
      contentHash
    };
  } catch (error) {
    console.error('Error retrieving question set:', error);
    throw new Error(`Failed to retrieve question set: ${error.message}`);
  }
};

// Helper function to submit answers to the blockchain
export const submitAnswersToBlockchain = async (
  questionManager,
  questionSetId,
  answerHashes
) => {
  try {
    if (!questionManager) throw new Error("No question manager contract available");
    
    console.log("Submitting answers in a single transaction...");
    console.log("Question Set ID:", questionSetId);
    console.log("Answer Hashes:", answerHashes);

    // Set a reasonable gas limit
    const gasLimit = 3000000;
    
    // Let ethers.js handle the nonce automatically
    const tx = await questionManager.submitAssessmentAnswers(
      questionSetId,
      answerHashes,
      {
        gasLimit
      }
    );
    
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);
    
    return {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error("Error submitting answers to blockchain:", error);
    
    // Provide more helpful error messages for common issues
    if (error.code === 4001) {
      throw new Error("Transaction rejected: You canceled the transaction.");
    } else if (error.message.includes("insufficient funds")) {
      throw new Error("Insufficient funds: Your wallet doesn't have enough ETH to cover gas fees.");
    } else {
      throw error; // Re-throw any other errors
    }
  }
}; 