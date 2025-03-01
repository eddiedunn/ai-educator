/**
 * Examples of how to use the contractTestUtils.js functions
 * to diagnose and fix issues with the question submission process.
 * 
 * These examples can be copied into your console or a React component.
 */

import { ethers } from 'ethers';
import {
  checkQuestionSet,
  checkPreviousAssessment,
  checkVerifierSetup,
  disableChainlinkTemporarily,
  enableChainlink,
  restartAssessment,
  submitWithGasEstimate,
  runCompleteDiagnostics,
  quickPreSubmissionCheck
} from './contractTestUtils';

/**
 * EXAMPLE 1: Diagnose why a question set submission is failing
 * This can be run directly from the browser console after adding in your values
 */
async function diagnoseSubmissionIssue() {
  // Replace these with your actual values
  const questionSetId = "univ2"; // The ID you're having trouble with
  const answersHash = "0x123456..."; // Your actual answers hash
  
  // Get the provider from window.ethereum
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  // Get a reference to the QuestionManager contract
  // Replace with your actual contract address and ABI
  const questionManagerAddress = "0x0cB0e4Df0Df1e000565E555b281b7084670116dE";
  const questionManagerABI = []; // Your contract ABI goes here
  const questionManager = new ethers.Contract(
    questionManagerAddress,
    questionManagerABI,
    signer
  );
  
  // Run the complete diagnostics
  const results = await runCompleteDiagnostics(
    questionManager,
    provider,
    questionSetId,
    answersHash
  );
  
  console.log("Diagnostic results:", results);
  
  // Based on results, you can take action
  if (!results.success) {
    console.log(`Failed at stage: ${results.stage}`);
    console.log(`Reason: ${results.reason}`);
    
    if (results.stage === "assessment status" && results.reason.includes("completed")) {
      // Try to restart the assessment
      const restarted = await restartAssessment(questionManager, questionSetId);
      if (restarted) {
        console.log("Assessment restarted! Try submitting again.");
      }
    }
  }
}

/**
 * EXAMPLE 2: Add this function to your React component that handles submissions
 * This wraps your existing submission logic with diagnostics
 */
async function enhancedSubmitAssessment(questionSetId, answers) {
  try {
    // Your existing code to get the questionManager and generate answersHash
    // ...
    
    // For this example, assume these variables are already defined:
    // - questionManager: your contract instance
    // - answersHash: the hash of the user's answers
    
    // First, run a quick check
    const isReady = await quickPreSubmissionCheck(questionManager, questionSetId);
    
    if (!isReady) {
      console.error("Pre-submission check failed. See console for details.");
      return false;
    }
    
    // Try submitting with gas estimation
    const result = await submitWithGasEstimate(
      questionManager,
      questionSetId,
      answersHash
    );
    
    if (result.success) {
      console.log("Assessment submitted successfully!");
      return true;
    } else {
      console.error("Submission failed:", result.error);
      
      // If the error suggests Chainlink issues and you're the admin,
      // you might want to temporarily disable Chainlink
      if (
        result.error.includes("chainlink") || 
        result.error.includes("verifier") ||
        result.error.includes("subscription")
      ) {
        // Check if current user is contract owner
        const owner = await questionManager.owner();
        const currentUser = await questionManager.signer.getAddress();
        
        if (owner.toLowerCase() === currentUser.toLowerCase()) {
          console.log("You're the contract owner. Would you like to temporarily disable Chainlink?");
          // In a real app, you'd show a UI prompt here
          // For this example, we'll just log a message
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error("Error in enhanced submit:", error);
    return false;
  }
}

/**
 * EXAMPLE 3: Specific test for the "univ2" question set
 * Add this to your AssessmentPage.js to diagnose issues with that specific set
 */
async function checkUniv2Setup(questionManager) {
  if (!questionManager) {
    console.error("Question manager not available!");
    return;
  }
  
  console.log("Checking 'univ2' question set setup...");
  
  // Check if the question set exists and is active
  const questionSetResult = await checkQuestionSet(questionManager, "univ2");
  
  if (!questionSetResult.exists) {
    console.error("'univ2' question set does not exist!");
    console.log("Available question sets:", questionSetResult.allSets);
    return;
  }
  
  if (!questionSetResult.isActive) {
    console.error("'univ2' question set exists but is not active!");
    return;
  }
  
  console.log("'univ2' question set exists and is active ✅");
  
  // Check if the current user has already completed this assessment
  const userAddress = await questionManager.signer.getAddress();
  console.log(`Checking previous assessment for user: ${userAddress}`);
  
  const assessmentResult = await checkPreviousAssessment(questionManager, "univ2");
  
  if (assessmentResult.completed) {
    console.error("You've already completed this assessment. Restarting...");
    await restartAssessment(questionManager, "univ2");
    console.log("Assessment restarted! Try submitting again.");
  } else {
    console.log("No completed assessment found for this question set ✅");
  }
  
  // Check chainlink verifier setup
  const provider = questionManager.provider;
  const verifierResult = await checkVerifierSetup(questionManager, provider);
  
  if (verifierResult.enabled) {
    if (!verifierResult.configured) {
      console.error("Chainlink verifier is enabled but not properly configured!");
      console.log("Consider temporarily disabling Chainlink for testing:");
      console.log("await disableChainlinkTemporarily(questionManager);");
    } else {
      console.log("Chainlink verifier is properly configured ✅");
    }
  } else {
    console.log("Chainlink verifier is disabled, verification will be skipped ✅");
  }
  
  console.log("'univ2' setup check complete!");
}

/**
 * EXAMPLE 4: Integration with the AssessmentPage component
 * Here's how you could modify your AssessmentPage component to include these tests
 */
/*
import React, { useEffect, useState } from 'react';
import { checkUniv2Setup, submitWithGasEstimate } from '../utils/contractTestUtils';

// In your component:
useEffect(() => {
  if (questionManager && id === "univ2") {
    // Automatically check univ2 setup when loading this question set
    checkUniv2Setup(questionManager);
  }
}, [questionManager, id]);

// In your handleSubmitAssessment function:
const handleSubmitAssessment = async () => {
  setSubmitting(true);
  try {
    // Your existing code to prepare answers
    // ...
    
    // Use enhanced submission with proper gas estimation
    const result = await submitWithGasEstimate(
      questionManager,
      id,
      answersHash
    );
    
    if (result.success) {
      setSubmitted(true);
      setSubmitError(null);
    } else {
      setSubmitError(`Submission failed: ${result.error || 'Unknown error'}`);
      console.error("Detailed error:", result);
    }
  } catch (error) {
    setSubmitError(`Error: ${error.message}`);
    console.error("Submission error:", error);
  } finally {
    setSubmitting(false);
  }
};
*/

export { diagnoseSubmissionIssue, enhancedSubmitAssessment, checkUniv2Setup }; 