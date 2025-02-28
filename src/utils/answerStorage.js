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

// Submit answers to the blockchain
export const submitAnswersToBlockchain = async (questionManager, questionSetId, answers) => {
  try {
    debugLog('Starting answer submission process...');
    
    // First check if the user has an active assessment
    let hasActiveAssessment = false;
    try {
      const userAssessment = await questionManager.userAssessments(await questionManager.signer.getAddress());
      hasActiveAssessment = userAssessment.active;
      debugLog('Assessment status check:', hasActiveAssessment ? 'Active' : 'Inactive');
    } catch (error) {
      debugLog('Error checking assessment status:', error);
    }
    
    // If no active assessment, try to request one
    if (!hasActiveAssessment) {
      debugLog('No active assessment found. Starting a new assessment...');
      try {
        const tx = await questionManager.startAssessment(questionSetId, {
          gasLimit: 300000 // Explicit gas limit to bypass estimation issues
        });
        await tx.wait();
        debugLog('Assessment started successfully!');
      } catch (error) {
        console.error('Error starting assessment:', error);
        throw new Error(`Failed to start assessment: ${error.message}`);
      }
    }
    
    // Store the answers and get the hash
    const { answersHash } = await storeAnswers(questionSetId, answers);
    
    // Now submit the hash to the blockchain
    debugLog('Submitting answers hash:', answersHash);
    debugLog('Using arrayify on hash...');
    
    // Add gas limit explicitly to avoid estimation issues
    const tx = await questionManager.submitAnswers(ethers.utils.arrayify(answersHash), {
      gasLimit: 300000 // Explicit gas limit to bypass estimation issues
    });
    await tx.wait();
    
    debugLog('Answers submitted to blockchain:', tx.hash);
    return {
      transactionHash: tx.hash,
      answersHash
    };
  } catch (error) {
    console.error('Error submitting answers to blockchain:', error);
    throw new Error(`Failed to submit answers to blockchain: ${error.message}`);
  }
}; 