import { ethers } from 'ethers';
import ChainlinkAnswerVerifierArtifact from '../abis/contracts/ChainlinkAnswerVerifier.sol/ChainlinkAnswerVerifier.json';

/**
 * A collection of utility functions for testing and debugging contract interactions
 * specifically focused on the question submission process.
 * 
 * These tests should help identify why transactions might be reverting during
 * the submitAssessmentAnswers function call.
 */

/**
 * Checks if a specified question set exists and is active
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {String} questionSetId - The ID of the question set to check (e.g., "univ2")
 * @returns {Promise<Object>} - Results of the check
 */
export async function checkQuestionSet(questionManager, questionSetId) {
  try {
    console.log(`[TEST] Checking question set: ${questionSetId}`);
    
    // Get all question sets
    const allSets = await questionManager.getQuestionSets();
    console.log("All question sets:", allSets);
    
    // Check if the specified set exists in the list
    const hasSet = allSets.includes(questionSetId);
    console.log(`Has question set "${questionSetId}": ${hasSet}`);
    
    let isActive = false;
    let contentHash = null;
    
    if (hasSet) {
      // Check if it's active by directly accessing question set data
      const questionSetData = await questionManager.questionSets(questionSetId);
      isActive = questionSetData.active;
      console.log(`Is "${questionSetId}" active: ${isActive}`);
      
      // Get content hash
      try {
        contentHash = questionSetData.contentHash;
        console.log(`Content hash: ${contentHash}`);
      } catch (error) {
        console.error("Error getting question set details:", error.message);
      }
    }
    
    return {
      exists: hasSet,
      isActive,
      contentHash,
      allSets
    };
  } catch (error) {
    console.error("Error checking question set:", error);
    return {
      error: error.message,
      exists: false,
      isActive: false
    };
  }
}

/**
 * Checks if the user has already completed an assessment for the given question set
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {String} questionSetId - The ID of the question set to check
 * @returns {Promise<Object>} - Assessment status information
 */
export async function checkPreviousAssessment(questionManager, questionSetId) {
  try {
    const userAddress = await questionManager.signer.getAddress();
    console.log(`[TEST] Checking previous assessment for user: ${userAddress}`);
    console.log(`Question set: ${questionSetId}`);
    
    // Get user's assessment for this question set
    let assessment;
    try {
      assessment = await questionManager.getUserAssessment(userAddress);
      console.log("Assessment data:", assessment);
    } catch (error) {
      console.log("No existing assessment found or error retrieving it:", error.message);
      return { exists: false, completed: false };
    }
    
    // Check if assessment exists and is completed
    const exists = assessment && assessment.questionSetId && assessment.questionSetId !== "" && assessment.questionSetId === questionSetId;
    const completed = exists && assessment.completed;
    
    // Get additional info
    let score = 0;
    let answersHash = "";
    if (exists) {
      score = assessment.score.toNumber();
      answersHash = assessment.answersHash;
    }
    
    return {
      exists,
      completed,
      score,
      answersHash,
      assessmentData: assessment
    };
  } catch (error) {
    console.error("Error checking previous assessment:", error);
    return { error: error.message };
  }
}

/**
 * Verifies the configuration of the Chainlink verifier contract
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {Object} provider - Ethers provider instance
 * @returns {Promise<Object>} - Verifier configuration status
 */
export async function checkVerifierSetup(questionManager, provider) {
  try {
    console.log("[TEST] Checking Chainlink verifier setup");
    
    // Check if Chainlink is enabled
    const useChainlink = await questionManager.useChainlinkFunctions();
    console.log(`Chainlink functions enabled: ${useChainlink}`);
    
    if (!useChainlink) {
      console.log("Chainlink functions are disabled, so verification will be skipped.");
      return { enabled: false };
    }
    
    // Get verifier address
    const verifierAddress = await questionManager.answerVerifier();
    console.log(`Verifier address: ${verifierAddress}`);
    
    if (verifierAddress === ethers.constants.AddressZero) {
      console.log("Verifier not set up in QuestionManager!");
      return { 
        enabled: useChainlink,
        configured: false,
        reason: "Verifier address not set" 
      };
    }
    
    // Connect to verifier contract
    const signer = questionManager.signer;
    const verifier = new ethers.Contract(
      verifierAddress,
      ChainlinkAnswerVerifierArtifact.abi,
      signer
    );
    
    // Check if contract exists
    const code = await provider.getCode(verifierAddress);
    if (code === '0x') {
      console.error("No contract found at verifier address!");
      return { 
        enabled: useChainlink,
        configured: false,
        reason: "No contract at verifier address" 
      };
    }
    
    // Check source code
    let sourceCode = '';
    try {
      sourceCode = await verifier.evaluationSource();
      console.log(`Has source code: ${sourceCode.length > 0}`);
      if (sourceCode.length === 0) {
        console.error("Evaluation source code not set!");
      }
    } catch (error) {
      console.error("Error checking source code:", error.message);
      return { 
        enabled: useChainlink,
        configured: false,
        reason: "Error accessing source code" 
      };
    }
    
    // Check subscription ID
    let subId = 0;
    try {
      subId = await verifier.subscriptionId();
      console.log(`Subscription ID: ${subId.toString()}`);
      if (subId.toString() === '0') {
        console.error("Subscription ID not set!");
      }
    } catch (error) {
      console.error("Error checking subscription ID:", error.message);
      return { 
        enabled: useChainlink,
        configured: false,
        reason: "Error accessing subscription ID" 
      };
    }
    
    // Check if QuestionManager is authorized
    let isAuthorized = false;
    try {
      isAuthorized = await verifier.authorizedCallers(questionManager.address);
      console.log(`QuestionManager authorized: ${isAuthorized}`);
      if (!isAuthorized) {
        console.error("QuestionManager is not authorized to call the verifier!");
      }
    } catch (error) {
      console.error("Error checking authorization:", error.message);
      return { 
        enabled: useChainlink,
        configured: false,
        reason: "Error checking authorization" 
      };
    }
    
    // Check owner
    let owner;
    try {
      owner = await verifier.owner();
      console.log(`Verifier owner: ${owner}`);
      const currentUser = await signer.getAddress();
      console.log(`Current user: ${currentUser}`);
      console.log(`Is current user the owner: ${owner.toLowerCase() === currentUser.toLowerCase()}`);
    } catch (error) {
      console.error("Error checking verifier owner:", error.message);
    }
    
    return {
      enabled: useChainlink,
      configured: sourceCode.length > 0 && subId.toString() !== '0' && isAuthorized,
      address: verifierAddress,
      hasSourceCode: sourceCode.length > 0,
      subscriptionId: subId.toString(),
      isAuthorized,
      owner
    };
  } catch (error) {
    console.error("Error checking verifier setup:", error);
    return {
      error: error.message,
      enabled: false,
      configured: false
    };
  }
}

/**
 * Temporarily disables Chainlink functions for testing purposes
 * @param {Object} questionManager - The QuestionManager contract instance
 * @returns {Promise<Boolean>} - Whether operation was successful
 */
export async function disableChainlinkTemporarily(questionManager) {
  try {
    console.log("[TEST] Temporarily disabling Chainlink for testing");
    
    const signer = questionManager.signer;
    const ownerAddress = await questionManager.owner();
    const currentUser = await signer.getAddress();
    
    if (ownerAddress.toLowerCase() !== currentUser.toLowerCase()) {
      console.error("Only the contract owner can modify Chainlink settings!");
      console.log(`Owner: ${ownerAddress}`);
      console.log(`Current user: ${currentUser}`);
      return false;
    }
    
    // Check current status
    const useChainlink = await questionManager.useChainlinkFunctions();
    console.log(`Currently using Chainlink: ${useChainlink}`);
    
    if (useChainlink) {
      // Disable Chainlink temporarily
      console.log("Disabling Chainlink functions...");
      const tx = await questionManager.setUseChainlinkFunctions(false);
      await tx.wait();
      
      // Verify it was disabled
      const newStatus = await questionManager.useChainlinkFunctions();
      console.log(`New Chainlink status: ${newStatus}`);
      
      if (!newStatus) {
        console.log("✅ Chainlink successfully disabled for testing");
        console.log("IMPORTANT: Don't forget to re-enable Chainlink after testing!");
        console.log("To re-enable: await questionManager.setUseChainlinkFunctions(true)");
        return true;
      } else {
        console.error("Failed to disable Chainlink!");
        return false;
      }
    } else {
      console.log("Chainlink is already disabled.");
      return true;
    }
  } catch (error) {
    console.error("Error updating Chainlink settings:", error);
    return false;
  }
}

/**
 * Re-enables Chainlink functions after testing
 * @param {Object} questionManager - The QuestionManager contract instance
 * @returns {Promise<Boolean>} - Whether operation was successful
 */
export async function enableChainlink(questionManager) {
  try {
    console.log("[TEST] Re-enabling Chainlink functions");
    
    const signer = questionManager.signer;
    const ownerAddress = await questionManager.owner();
    const currentUser = await signer.getAddress();
    
    if (ownerAddress.toLowerCase() !== currentUser.toLowerCase()) {
      console.error("Only the contract owner can modify Chainlink settings!");
      return false;
    }
    
    // Check current status
    const useChainlink = await questionManager.useChainlinkFunctions();
    
    if (!useChainlink) {
      // Enable Chainlink
      const tx = await questionManager.setUseChainlinkFunctions(true);
      await tx.wait();
      
      // Verify it was enabled
      const newStatus = await questionManager.useChainlinkFunctions();
      console.log(`Chainlink enabled: ${newStatus}`);
      return newStatus;
    } else {
      console.log("Chainlink is already enabled.");
      return true;
    }
  } catch (error) {
    console.error("Error updating Chainlink settings:", error);
    return false;
  }
}

/**
 * Restarts a user's assessment for a given question set
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {String} questionSetId - The ID of the question set
 * @returns {Promise<Boolean>} - Whether restart was successful
 */
export async function restartAssessment(questionManager, questionSetId) {
  try {
    console.log(`[TEST] Restarting assessment for question set: ${questionSetId}`);
    
    const tx = await questionManager.restartAssessment(questionSetId);
    console.log("Restart transaction submitted:", tx.hash);
    await tx.wait();
    console.log("Assessment successfully restarted!");
    return true;
  } catch (error) {
    console.error("Error restarting assessment:", error);
    return false;
  }
}

/**
 * Submit assessment answers with proper gas estimation
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {String} questionSetId - The ID of the question set
 * @param {String} answersHash - The hash of the answers
 * @returns {Promise<Object>} - Submission result
 */
export async function submitWithGasEstimate(questionManager, questionSetId, answersHash) {
  try {
    console.log("[TEST] Submitting assessment with gas estimation");
    console.log(`Question Set ID: ${questionSetId}`);
    console.log(`Answers Hash: ${answersHash}`);
    
    // Log the signer address
    const signer = await questionManager.signer.getAddress();
    console.log(`Submitting as: ${signer}`);
    
    // Estimate gas for the transaction
    console.log("Estimating gas...");
    let gasEstimate;
    try {
      gasEstimate = await questionManager.estimateGas.submitAssessmentAnswers(
        questionSetId,
        answersHash
      );
      console.log(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (error) {
      console.error("Gas estimation failed:", error.message);
      if (error.reason) {
        console.error("Revert reason:", error.reason);
      }
      
      // Try to extract error data
      if (error.data) {
        console.error("Error data:", error.data);
      }
      
      // Check for "Source code not set" error which indicates Chainlink configuration issues
      if (error.message && error.message.includes("Source code not set")) {
        console.error("\n==============================================");
        console.error("DETECTED CHAINLINK CONFIGURATION ISSUE!");
        console.error("The Chainlink verifier's source code is not set.");
        console.error("==============================================");
        console.error("RECOMMENDED ACTION: Use submitWithChainlinkBypass() function instead");
        console.error("Example: await submitWithChainlinkBypass(questionManager, provider, questionSetId, answersHash)");
        console.error("==============================================\n");
      }
      
      return {
        success: false,
        error: error.message,
        stage: "gas estimation"
      };
    }
    
    // Add 30% buffer to the gas estimate for safety
    const gasWithBuffer = gasEstimate.mul(130).div(100);
    console.log(`Gas with 30% buffer: ${gasWithBuffer.toString()}`);
    
    // Submit the transaction with explicit gas limit
    console.log("Submitting transaction...");
    const tx = await questionManager.submitAssessmentAnswers(
      questionSetId,
      answersHash,
      { gasLimit: gasWithBuffer }
    );
    
    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block number:", receipt.blockNumber);
    
    return {
      success: true,
      transactionHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error("Error during submission:", error);
    
    // Check if error contains revert reason
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
    
    return {
      success: false,
      error: error.message,
      reason: error.reason || "Unknown error",
      stage: "transaction"
    };
  }
}

/**
 * Submit assessment answers by temporarily bypassing Chainlink verification
 * This is useful when Chainlink is not properly configured but you want to test the core submission logic
 * 
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {Object} provider - Ethers provider instance
 * @param {String} questionSetId - The ID of the question set
 * @param {String} answersHash - The hash of the answers
 * @returns {Promise<Object>} - Submission result
 */
export async function submitWithChainlinkBypass(questionManager, provider, questionSetId, answersHash) {
  console.log("\n==============================================");
  console.log("SUBMITTING WITH CHAINLINK VERIFICATION BYPASS");
  console.log("This is a testing utility and should not be used in production");
  console.log("==============================================\n");
  
  // Check if Chainlink is enabled
  const chainlinkWasEnabled = await questionManager.useChainlinkFunctions();
  let didDisableChainlink = false;
  
  try {
    // If Chainlink is enabled, disable it temporarily
    if (chainlinkWasEnabled) {
      console.log("1️⃣ Temporarily disabling Chainlink for this submission...");
      const disableResult = await disableChainlinkTemporarily(questionManager);
      
      if (!disableResult) {
        console.error("❌ Failed to disable Chainlink. You might not have permission.");
        return {
          success: false,
          error: "Failed to disable Chainlink. Only the contract owner can do this.",
          stage: "chainlink-disable"
        };
      }
      
      didDisableChainlink = true;
    } else {
      console.log("Chainlink is already disabled, proceeding with submission...");
    }
    
    // Submit with gas estimation
    console.log("2️⃣ Submitting assessment answers...");
    const result = await submitWithGasEstimate(questionManager, questionSetId, answersHash);
    
    // Re-enable Chainlink if we disabled it
    if (didDisableChainlink && chainlinkWasEnabled) {
      console.log("3️⃣ Re-enabling Chainlink...");
      await enableChainlink(questionManager);
    }
    
    return {
      ...result,
      chainlinkBypassUsed: true,
      originalChainlinkState: chainlinkWasEnabled
    };
  } catch (error) {
    console.error("Error in Chainlink bypass submission:", error);
    
    // Try to re-enable Chainlink if we disabled it
    if (didDisableChainlink && chainlinkWasEnabled) {
      console.log("⚠️ Error occurred. Attempting to restore Chainlink state...");
      await enableChainlink(questionManager);
    }
    
    return {
      success: false,
      error: error.message,
      stage: "chainlink-bypass",
      chainlinkBypassUsed: true,
      originalChainlinkState: chainlinkWasEnabled
    };
  }
}

/**
 * Runs a complete sequence of tests to diagnose assessment submission issues
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {Object} provider - Ethers provider instance
 * @param {String} questionSetId - The ID of the question set
 * @param {String} answersHash - The hash of the answers
 * @returns {Promise<Object>} - Test results
 */
export async function runCompleteDiagnostics(questionManager, provider, questionSetId, answersHash) {
  console.log("==========================================");
  console.log("RUNNING COMPLETE SUBMISSION DIAGNOSTICS");
  console.log("==========================================");
  
  // Step 1: Check if the question set exists and is active
  console.log("\n[STEP 1] Checking question set configuration...");
  const questionSetResult = await checkQuestionSet(questionManager, questionSetId);
  
  if (!questionSetResult.exists) {
    return {
      success: false,
      stage: "question set",
      reason: `Question set '${questionSetId}' does not exist`,
      details: questionSetResult
    };
  }
  
  if (!questionSetResult.isActive) {
    return {
      success: false,
      stage: "question set",
      reason: `Question set '${questionSetId}' exists but is not active`,
      details: questionSetResult
    };
  }
  
  // Step 2: Check if the user has already completed this assessment
  console.log("\n[STEP 2] Checking previous assessment status...");
  const assessmentResult = await checkPreviousAssessment(questionManager, questionSetId);
  
  if (assessmentResult.completed) {
    console.log("Assessment already completed, attempting to restart...");
    await restartAssessment(questionManager, questionSetId);
    
    // Check again to ensure it was restarted
    const restartCheck = await checkPreviousAssessment(questionManager, questionSetId);
    if (restartCheck.completed) {
      return {
        success: false,
        stage: "assessment status",
        reason: "Failed to restart previously completed assessment",
        details: restartCheck
      };
    }
  }
  
  // Step 3: Check verifier setup
  console.log("\n[STEP 3] Checking Chainlink verifier setup...");
  const verifierResult = await checkVerifierSetup(questionManager, provider);
  
  // Determine submission strategy based on Chainlink configuration
  let submissionResult;
  
  if (verifierResult.enabled) {
    if (!verifierResult.configured) {
      console.log("\nChainlink is enabled but not properly configured.");
      
      // Check for source code specifically
      if (!verifierResult.hasSourceCode) {
        console.log("DETECTED ISSUE: Source code not set in the verifier contract");
        
        console.log("\n[STEP 4] Using Chainlink bypass for submission...");
        submissionResult = await submitWithChainlinkBypass(
          questionManager,
          provider,
          questionSetId,
          answersHash
        );
      } else {
        // Other configuration issues
        console.log("Temporarily disabling Chainlink for testing...");
        await disableChainlinkTemporarily(questionManager);
        
        console.log("\n[STEP 4] Submitting assessment with proper gas estimation...");
        submissionResult = await submitWithGasEstimate(
          questionManager,
          questionSetId,
          answersHash
        );
        
        // Re-enable Chainlink
        console.log("\n[STEP 5] Re-enabling Chainlink...");
        await enableChainlink(questionManager);
      }
    } else {
      // Chainlink is properly configured, proceed normally
      console.log("\n[STEP 4] Submitting assessment with proper gas estimation...");
      submissionResult = await submitWithGasEstimate(
        questionManager,
        questionSetId,
        answersHash
      );
    }
  } else {
    // Chainlink is disabled, proceed normally
    console.log("\n[STEP 4] Submitting assessment with proper gas estimation...");
    submissionResult = await submitWithGasEstimate(
      questionManager,
      questionSetId,
      answersHash
    );
  }
  
  console.log("\n==========================================");
  console.log(submissionResult.success ? "SUBMISSION SUCCESSFUL! ✅" : "SUBMISSION FAILED ❌");
  console.log("==========================================");
  
  return {
    success: submissionResult.success,
    questionSetStatus: questionSetResult,
    assessmentStatus: assessmentResult,
    verifierStatus: verifierResult,
    submissionResult
  };
}

/**
 * Run a quick check of only critical parameters before submission
 * @param {Object} questionManager - The QuestionManager contract instance
 * @param {String} questionSetId - The ID of the question set
 * @returns {Promise<Boolean>} - Whether prerequisites are satisfied
 */
export async function quickPreSubmissionCheck(questionManager, questionSetId) {
  try {
    console.log("[QUICK CHECK] Verifying submission prerequisites");
    
    // Check question set exists and is active
    const allSets = await questionManager.getQuestionSets();
    const hasSet = allSets.includes(questionSetId);
    
    if (!hasSet) {
      console.error(`Question set "${questionSetId}" does not exist!`);
      return false;
    }
    
    // Check if the question set is active by directly accessing its data
    const questionSetData = await questionManager.questionSets(questionSetId);
    if (!questionSetData || !questionSetData.active) {
      console.error(`Question set "${questionSetId}" is not active!`);
      return false;
    }
    
    // Check if user has already completed this assessment
    const userAddress = await questionManager.signer.getAddress();
    const assessment = await questionManager.getUserAssessment(userAddress);
    
    // Check if this is the current active assessment and if it's completed
    if (assessment && assessment.questionSetId === questionSetId && assessment.completed) {
      console.error("You've already completed this assessment. Please restart it first.");
      return false;
    }
    
    // Check if Chainlink is properly configured (if enabled)
    const useChainlink = await questionManager.useChainlinkFunctions();
    
    if (useChainlink) {
      const verifierAddress = await questionManager.answerVerifier();
      
      if (verifierAddress === ethers.constants.AddressZero) {
        console.error("Chainlink is enabled but verifier address is not set!");
        return false;
      }
    }
    
    console.log("✅ All basic checks passed! Ready for submission.");
    return true;
  } catch (error) {
    console.error("Error during quick check:", error);
    return false;
  }
} 