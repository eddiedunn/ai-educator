import { ethers } from 'ethers';
import ChainlinkAnswerVerifierArtifact from '../abis/contracts/ChainlinkAnswerVerifier.sol/ChainlinkAnswerVerifier.json';
import QuestionManagerArtifact from '../abis/contracts/QuestionManager.sol/QuestionManager.json';

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
    console.log("Checking Chainlink verifier setup...");
    
    // Get the verifier address from the QuestionManager
    const verifierAddress = await questionManager.answerVerifier();
    console.log(`Verifier address from QuestionManager: ${verifierAddress}`);
    
    // Check if verifier address is valid
    if (verifierAddress === '0x0000000000000000000000000000000000000000') {
      console.error("❌ ERROR: Verifier address is not set in QuestionManager");
      return {
        configured: false,
        chainlinkEnabled: false,
        status: "Chainlink is enabled but not configured",
        message: "The verifier address is not set in the QuestionManager contract"
      };
    }
    
    // Get the QuestionManager address for authorization checks
    const questionManagerAddress = questionManager.address;
    console.log(`QuestionManager address: ${questionManagerAddress}`);
    
    // Check if there's actually a contract at the verifier address
    const code = await provider.getCode(verifierAddress);
    if (code === '0x' || code === '0x0') {
      console.error(`❌ ERROR: No contract found at verifier address: ${verifierAddress}`);
      return {
        configured: false,
        chainlinkEnabled: true,
        status: "Chainlink is enabled but not configured",
        message: "No contract found at the verifier address"
      };
    }
    
    console.log("✅ Contract exists at verifier address");
    
    // Create a verifier contract instance
    const verifier = new ethers.Contract(
      verifierAddress,
      ChainlinkAnswerVerifierArtifact.abi,
      provider
    );
    
    // Check if QuestionManager is authorized
    try {
      const isAuthorized = await verifier.authorizedCallers(questionManagerAddress);
      console.log(`Authorization status: ${isAuthorized ? "✅ Authorized" : "❌ NOT Authorized"}`);
      
      if (!isAuthorized) {
        console.error("❌ ERROR: QuestionManager is not an authorized caller in the ChainlinkAnswerVerifier");
        console.error("This will cause transactions to revert with 'Caller not authorized'");
        console.error("Run the setup-chainlink-connection.js script to fix this issue");
        return {
          configured: false,
          chainlinkEnabled: true,
          status: "Chainlink is enabled but not properly configured",
          message: "QuestionManager is not authorized to call the verifier"
        };
      }
    } catch (error) {
      console.error("❌ ERROR checking authorization status:", error.message);
      return {
        configured: false,
        chainlinkEnabled: true,
        status: "Chainlink is enabled but authorization check failed",
        message: `Error checking authorization: ${error.message}`
      };
    }
    
    // Check if source code is set
    let sourceCode;
    try {
      sourceCode = await verifier.evaluationSource();
      console.log(`Source code present: ${sourceCode && sourceCode.length > 0 ? "✅ Yes" : "❌ No"}`);
      if (sourceCode && sourceCode.length > 0) {
        console.log(`Source code length: ${sourceCode.length} characters`);
      } else {
        console.error("❌ ERROR: Evaluation source code is not set or empty");
        return {
          configured: false,
          chainlinkEnabled: true,
          status: "Chainlink is enabled but source code is not set",
          message: "Evaluation source code is not configured"
        };
      }
    } catch (error) {
      console.error("❌ ERROR accessing source code:", error.message);
      return {
        configured: false,
        chainlinkEnabled: true,
        status: "Chainlink is enabled but source code check failed",
        message: `Error accessing source code: ${error.message}`
      };
    }
    
    // Check DON ID and Subscription ID
    try {
      const donId = await verifier.donId();
      const subscriptionId = await verifier.subscriptionId();
      console.log(`DON ID: ${ethers.utils.parseBytes32String(donId)}`);
      console.log(`Subscription ID: ${subscriptionId.toString()}`);
      
      if (subscriptionId.toString() === '0') {
        console.error("❌ ERROR: Subscription ID is not set (value is 0)");
        return {
          configured: false,
          chainlinkEnabled: true,
          status: "Chainlink is enabled but subscription ID is not set",
          message: "Subscription ID is not configured"
        };
      }
    } catch (error) {
      console.error("❌ ERROR accessing configuration:", error.message);
      return {
        configured: false,
        chainlinkEnabled: true,
        status: "Chainlink is enabled but configuration check failed",
        message: `Error accessing configuration: ${error.message}`
      };
    }
    
    // All checks passed
    console.log("✅ Chainlink verifier is properly configured");
    return {
      configured: true,
      chainlinkEnabled: true,
      status: "Chainlink is enabled and properly configured",
      message: "Verifier is properly set up and ready to use"
    };
  } catch (error) {
    console.error("❌ ERROR in verifier setup check:", error.message);
    return {
      configured: false,
      chainlinkEnabled: false,
      status: "Error checking Chainlink configuration",
      message: `Unexpected error: ${error.message}`
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
  console.log("Testing submission with gas estimation...");
  console.log(`Question Set ID: ${questionSetId}`);
  console.log(`Answers Hash: ${answersHash}`);
  
  try {
    // First, get more information about our contracts
    const verifierAddress = await questionManager.answerVerifier();
    console.log(`Verifier address from QuestionManager: ${verifierAddress}`);
    
    // Check if the verifier address is set
    if (verifierAddress === '0x0000000000000000000000000000000000000000') {
      console.error("❌ ERROR: No verifier address set in QuestionManager");
      return {
        success: false,
        error: "No verifier address set in QuestionManager",
        details: "The answerVerifier address in QuestionManager is set to the zero address. Run the setup-chainlink-connection.js script."
      };
    }
    
    // Create verifier instance
    const provider = questionManager.provider;
    const verifier = new ethers.Contract(
      verifierAddress,
      ChainlinkAnswerVerifierArtifact.abi,
      provider
    );
    
    // Check if QuestionManager is authorized
    const questionManagerAddress = questionManager.address;
    const isAuthorized = await verifier.authorizedCallers(questionManagerAddress);
    console.log(`QuestionManager authorized in verifier: ${isAuthorized ? 'Yes ✅' : 'No ❌'}`);
    
    if (!isAuthorized) {
      console.error("❌ ERROR: QuestionManager is not authorized to call the verifier");
      return {
        success: false,
        error: "Authorization error",
        details: "The QuestionManager contract is not authorized to call the ChainlinkAnswerVerifier. This will cause the transaction to revert with 'Caller not authorized'. Run the setup-chainlink-connection.js script to fix this."
      };
    }
    
    // Check if subscription ID is set
    const subscriptionId = await verifier.subscriptionId();
    console.log(`Subscription ID: ${subscriptionId.toString()}`);
    
    if (subscriptionId.toString() === '0') {
      console.error("❌ ERROR: Subscription ID is not set (value is 0)");
      return {
        success: false,
        error: "Missing subscription ID",
        details: "The subscription ID in the ChainlinkAnswerVerifier is set to 0. Configure the subscription ID using the Chainlink Setup panel or run update-chainlink-config.js."
      };
    }
    
    // Check if source code is set
    try {
      const sourceCode = await verifier.evaluationSource();
      console.log(`Source code length: ${sourceCode.length} characters`);
      
      if (!sourceCode || sourceCode.length === 0) {
        console.error("❌ ERROR: Evaluation source code is not set");
        return {
          success: false,
          error: "Missing source code",
          details: "The evaluation source code in the ChainlinkAnswerVerifier is empty. Configure the source code using the Chainlink Setup panel or run update-chainlink-config.js."
        };
      }
    } catch (error) {
      console.error(`❌ ERROR accessing source code: ${error.message}`);
      return {
        success: false,
        error: `Error accessing source code: ${error.message}`,
        details: "There was an error accessing the source code in the ChainlinkAnswerVerifier. This might indicate a contract interface mismatch."
      };
    }
    
    // Now, try to estimate gas for the submit assessment function
    console.log("Attempting to estimate gas for submitAssessment...");
    try {
      // Get question set content hash
      const questionSetContentHash = await questionManager.questionSetContentHashes(questionSetId);
      console.log(`Question set content hash: ${questionSetContentHash}`);
      
      // Check if the assessment exists and if it's already being verified
      const assessment = await questionManager.assessments(questionSetId);
      console.log("Assessment status:", {
        user: assessment.user,
        score: assessment.score.toString(),
        status: assessment.status.toString(),
        timestamp: assessment.timestamp.toString()
      });
      
      // If the assessment is already being verified, we can't submit again
      if (assessment.status.toString() === '1') { // 1 = Verifying
        console.error("❌ ERROR: Assessment is already in 'Verifying' state");
        return {
          success: false,
          error: "Assessment already being verified",
          details: "The assessment is already in the 'Verifying' state. Wait for the verification to complete or restart the assessment."
        };
      }
      
      // Estimate gas
      const gasEstimate = await questionManager.estimateGas.submitAssessment(
        questionSetId, 
        answersHash
      );
      
      console.log(`✅ Gas estimation successful: ${gasEstimate.toString()} gas units`);
      
      return {
        success: true,
        gasEstimate: gasEstimate.toString()
      };
    } catch (error) {
      console.error("❌ ERROR during gas estimation:", error.message);
      
      // Special error handling for specific error messages
      if (error.message.includes("Caller not authorized")) {
        return {
          success: false,
          error: "Authorization error",
          details: "The QuestionManager contract is not authorized to call the ChainlinkAnswerVerifier. Run the setup-chainlink-connection.js script to fix this."
        };
      } else if (error.message.includes("insufficient funds")) {
        return {
          success: false,
          error: "Insufficient funds",
          details: "Your wallet doesn't have enough ETH to cover gas costs for this transaction."
        };
      } else if (error.message.includes("execution reverted")) {
        return {
          success: false,
          error: "Execution reverted",
          details: error.message
        };
      }
      
      return {
        success: false,
        error: error.message,
        details: "Failed to estimate gas. This often happens when the transaction would revert. Check the authorization, subscription ID, and source code configuration."
      };
    }
  } catch (error) {
    console.error("❌ ERROR in submitWithGasEstimate:", error.message);
    return {
      success: false,
      error: error.message,
      details: "An unexpected error occurred while testing the submission."
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

export async function testChainlinkSetup(signer, contractAddresses) {
  console.log("🔍 Testing Chainlink Functions setup...");
  const results = {
    success: false,
    tests: {},
    errors: []
  };
  
  try {
    // Get contract addresses
    const questionManagerAddress = contractAddresses.questionManager;
    const verifierAddress = contractAddresses.chainlinkVerifier;
    
    console.log(`📋 Contract Addresses:`);
    console.log(`   - QuestionManager: ${questionManagerAddress}`);
    console.log(`   - ChainlinkAnswerVerifier: ${verifierAddress}`);
    
    // Check if contracts exist
    if (!questionManagerAddress || questionManagerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error("QuestionManager address is not valid");
    }
    
    if (!verifierAddress || verifierAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error("ChainlinkAnswerVerifier address is not valid");
    }
    
    // Create contract instances
    const questionManager = new ethers.Contract(
      questionManagerAddress,
      QuestionManagerArtifact.abi,
      signer
    );
    
    const verifier = new ethers.Contract(
      verifierAddress,
      ChainlinkAnswerVerifierArtifact.abi,
      signer
    );
    
    // Test 1: Check contract ownership
    console.log("🔑 Checking contract ownership...");
    const signerAddress = await signer.getAddress();
    const verifierOwner = await verifier.owner();
    
    results.tests.ownershipCheck = {
      signerAddress,
      verifierOwner,
      isOwner: verifierOwner.toLowerCase() === signerAddress.toLowerCase()
    };
    
    console.log(`   - Your address: ${signerAddress}`);
    console.log(`   - Verifier owner: ${verifierOwner}`);
    console.log(`   - You are ${results.tests.ownershipCheck.isOwner ? '✅' : '❌'} the owner of the verifier`);
    
    if (!results.tests.ownershipCheck.isOwner) {
      results.errors.push("You are not the owner of the ChainlinkAnswerVerifier contract");
    }
    
    // Test 2: Check if the QuestionManager has the correct verifier set
    console.log("🔄 Checking QuestionManager configuration...");
    const configuredVerifier = await questionManager.answerVerifier();
    
    results.tests.verifierConfig = {
      expectedVerifier: verifierAddress,
      actualVerifier: configuredVerifier,
      isCorrect: configuredVerifier.toLowerCase() === verifierAddress.toLowerCase()
    };
    
    console.log(`   - Expected verifier: ${verifierAddress}`);
    console.log(`   - Actual verifier: ${configuredVerifier}`);
    console.log(`   - Verifier configuration is ${results.tests.verifierConfig.isCorrect ? '✅' : '❌'} correct`);
    
    if (!results.tests.verifierConfig.isCorrect) {
      results.errors.push("QuestionManager has incorrect verifier address configured");
    }
    
    // Test 3: Check authorization status
    console.log("🔐 Checking authorization status...");
    const isAuthorized = await verifier.authorizedCallers(questionManagerAddress);
    
    results.tests.authorization = {
      isAuthorized
    };
    
    console.log(`   - QuestionManager is ${isAuthorized ? '✅' : '❌'} authorized to call the verifier`);
    
    if (!isAuthorized) {
      results.errors.push("QuestionManager is not authorized to call the ChainlinkAnswerVerifier");
    }
    
    // Test 4: Check Chainlink configuration
    console.log("⚙️ Checking Chainlink configuration...");
    const donId = await verifier.donId();
    const subscriptionId = await verifier.subscriptionId();
    let sourceCode;
    
    try {
      sourceCode = await verifier.evaluationSource();
      
      results.tests.chainlinkConfig = {
        donId,
        subscriptionId: subscriptionId.toString(),
        hasSourceCode: sourceCode && sourceCode.length > 0,
        sourceCodeLength: sourceCode ? sourceCode.length : 0
      };
      
      console.log(`   - DON ID: ${donId}`);
      console.log(`   - Subscription ID: ${subscriptionId.toString()}`);
      console.log(`   - Source code: ${sourceCode && sourceCode.length > 0 ? '✅' : '❌'} (${sourceCode ? sourceCode.length : 0} characters)`);
      
      if (!sourceCode || sourceCode.length === 0) {
        results.errors.push("No evaluation source code is set");
      }
      
      if (subscriptionId.toString() === '0') {
        results.errors.push("Subscription ID is not set (value is 0)");
      }
    } catch (error) {
      console.error(`   - ❌ Error accessing source code: ${error.message}`);
      results.tests.chainlinkConfig = {
        donId,
        subscriptionId: subscriptionId.toString(),
        hasSourceCode: false,
        sourceCodeError: error.message
      };
      
      results.errors.push(`Error accessing source code: ${error.message}`);
    }
    
    // Test 5: Check if verifier is a consumer in the Chainlink subscription
    console.log("🔗 Note: Cannot automatically check if verifier is added as a consumer in your Chainlink subscription");
    console.log("   - You need to verify this manually in the Chainlink Functions UI");
    
    // Final result
    results.success = results.errors.length === 0;
    
    console.log("\n📊 Test Summary:");
    if (results.success) {
      console.log("✅ All tests passed! Chainlink setup is correct.");
    } else {
      console.log("❌ Some tests failed. Please fix the following issues:");
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      
      console.log("\n🔧 Suggested fixes:");
      if (!results.tests.ownershipCheck?.isOwner) {
        console.log(`   - Use the wallet that owns the contracts (${results.tests.ownershipCheck?.verifierOwner}) to run the setup`);
      }
      
      if (!results.tests.verifierConfig?.isCorrect) {
        console.log(`   - Run 'npx hardhat setup-chainlink --network baseSepoliaTestnet' to configure the correct verifier address`);
      }
      
      if (!results.tests.authorization?.isAuthorized) {
        console.log(`   - Run 'npx hardhat setup-chainlink-connection --network baseSepoliaTestnet' to authorize the QuestionManager`);
      }
      
      if (!results.tests.chainlinkConfig?.hasSourceCode) {
        console.log(`   - Run 'npx hardhat update-chainlink --network baseSepoliaTestnet' to set the evaluation source code`);
      }
      
      if (results.tests.chainlinkConfig?.subscriptionId === '0') {
        console.log(`   - Run 'npx hardhat update-chainlink --network baseSepoliaTestnet' to set the subscription ID`);
      }
    }
  } catch (error) {
    console.error(`❌ ERROR in testChainlinkSetup: ${error.message}`);
    results.success = false;
    results.errors.push(error.message);
  }
  
  return results;
} 