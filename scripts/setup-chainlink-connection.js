// Script to properly set up the connection between QuestionManager and ChainlinkAnswerVerifier
// This script needs to be run once to establish the initial connection
const { ethers } = require("hardhat");
require('dotenv').config();

// Contract addresses - update with your deployed addresses
const QUESTION_MANAGER_ADDRESS = "0x0cB0e4Df0Df1e000565E555b281b7084670116dE";
const CHAINLINK_VERIFIER_ADDRESS = "0x094112Bf48270b426c9bE043ee002CbBF6AB813D";

async function main() {
  console.log("Setting up connection between QuestionManager and ChainlinkAnswerVerifier...");
  
  // Get the signer's address for logging
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  
  console.log("Connecting to contracts...");
  
  // Get deployed contract instances
  const verifierAddress = process.env.CHAINLINKANSWERVERIFIER_ADDRESS;
  const questionManagerAddress = process.env.QUESTIONMANAGER_ADDRESS;
  
  if (!verifierAddress) {
    console.error("❌ ERROR: ChainlinkAnswerVerifier address not found in environment variables");
    console.error("Please make sure CHAINLINKANSWERVERIFIER_ADDRESS is set in your .env file");
    process.exit(1);
  }
  
  if (!questionManagerAddress) {
    console.error("❌ ERROR: QuestionManager address not found in environment variables");
    console.error("Please make sure QUESTIONMANAGER_ADDRESS is set in your .env file");
    process.exit(1);
  }
  
  const verifier = await ethers.getContractAt("ChainlinkAnswerVerifier", verifierAddress);
  const questionManager = await ethers.getContractAt("QuestionManager", questionManagerAddress);
  
  // Verify contract ownership for troubleshooting
  const verifierOwner = await verifier.owner();
  const questionManagerOwner = await questionManager.owner();
  
  console.log("\nContract ownership information:");
  console.log(`ChainlinkAnswerVerifier owner: ${verifierOwner}`);
  console.log(`Your address: ${signer.address}`);
  console.log(`Are you the verifier owner? ${verifierOwner.toLowerCase() === signer.address.toLowerCase() ? 'Yes ✅' : 'No ❌'}`);
  console.log(`QuestionManager owner: ${questionManagerOwner}`);
  console.log(`Are you the question manager owner? ${questionManagerOwner.toLowerCase() === signer.address.toLowerCase() ? 'Yes ✅' : 'No ❌'}`);
  
  if (verifierOwner.toLowerCase() !== signer.address.toLowerCase()) {
    console.warn("\n⚠️ WARNING: You are not the owner of the ChainlinkAnswerVerifier contract.");
    console.warn("You may not have permission to add callers if not already set up.");
  }
  
  // Check if the QuestionManager is already authorized to call the verifier
  console.log("\nChecking if QuestionManager is already an authorized caller...");
  const isAuthorized = await verifier.authorizedCallers(questionManagerAddress);
  
  if (isAuthorized) {
    console.log("✅ QuestionManager is already an authorized caller in ChainlinkAnswerVerifier");
  } else {
    console.log("⚠️ QuestionManager is NOT an authorized caller. Attempting to add...");
    
    try {
      // Add the QuestionManager as an authorized caller
      const tx = await verifier.addCaller(questionManagerAddress);
      await tx.wait();
      
      // Verify authorization after the transaction
      const isNowAuthorized = await verifier.authorizedCallers(questionManagerAddress);
      
      if (isNowAuthorized) {
        console.log("✅ Successfully added QuestionManager as an authorized caller");
      } else {
        console.error("❌ Failed to add QuestionManager as an authorized caller even though transaction succeeded");
        console.error("This is unexpected behavior. Please check the contract implementation.");
      }
    } catch (error) {
      console.error("❌ ERROR: Failed to add QuestionManager as an authorized caller");
      console.error(`Error details: ${error.message}`);
      if (error.reason) console.error(`Reason: ${error.reason}`);
      
      // Check if it's an ownership issue
      if (error.message.includes("Ownable: caller is not the owner")) {
        console.error("\nThis error occurs because you are not the owner of the ChainlinkAnswerVerifier contract.");
        console.error(`Current owner is: ${verifierOwner}`);
        console.error(`Your address is: ${signer.address}`);
      }
    }
  }
  
  // Step 2: Check if QuestionManager knows about the verifier
  console.log("\nChecking if QuestionManager knows about ChainlinkAnswerVerifier...");
  let currentVerifier;
  try {
    currentVerifier = await questionManager.answerVerifier();
    
    if (currentVerifier.toLowerCase() === CHAINLINK_VERIFIER_ADDRESS.toLowerCase()) {
      console.log("✅ ChainlinkAnswerVerifier is already set in QuestionManager");
    } else {
      console.log(`❌ Current verifier (${currentVerifier}) is not the expected one. Updating...`);
      
      // Set the ChainlinkAnswerVerifier in QuestionManager
      try {
        const tx2 = await questionManager.setAnswerVerifier(CHAINLINK_VERIFIER_ADDRESS);
        console.log(`Transaction sent: ${tx2.hash}`);
        await tx2.wait();
        console.log("✅ Successfully set ChainlinkAnswerVerifier in QuestionManager");
      } catch (error) {
        console.error("Error setting verifier:", error.message);
        if (error.message.includes("Ownable: caller is not the owner")) {
          console.error("\n⚠️ You are not the owner of the QuestionManager contract!");
          console.error(`Current account: ${signer.address}`);
          const owner = await questionManager.owner();
          console.error(`Contract owner: ${owner}`);
          console.error("Please run this script with the contract owner's private key.");
        }
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("Error checking current verifier:", error.message);
    console.error("Attempting to set the verifier anyway...");
    
    // Try to set the verifier even if checking failed
    try {
      const tx2 = await questionManager.setAnswerVerifier(CHAINLINK_VERIFIER_ADDRESS);
      console.log(`Transaction sent: ${tx2.hash}`);
      await tx2.wait();
      console.log("✅ Successfully set ChainlinkAnswerVerifier in QuestionManager");
    } catch (error) {
      console.error("Error setting verifier:", error.message);
      process.exit(1);
    }
  }
  
  // Step 3: Verify the setup is correct
  console.log("\nVerifying the connection setup...");
  try {
    const isAuthorizedFinal = await verifier.authorizedCallers(questionManagerAddress);
    const currentVerifierFinal = await questionManager.answerVerifier();
    
    if (isAuthorizedFinal && 
        currentVerifierFinal.toLowerCase() === CHAINLINK_VERIFIER_ADDRESS.toLowerCase()) {
      console.log("\n✅ SUCCESS: QuestionManager and ChainlinkAnswerVerifier are properly connected!");
      console.log("\nNext steps:");
      console.log("1. Add the ChainlinkAnswerVerifier contract as a consumer in your Chainlink Functions subscription");
      console.log("   - Go to: https://functions.chain.link/base-sepolia");
      console.log(`   - Add consumer: ${CHAINLINK_VERIFIER_ADDRESS}`);
      console.log("2. Use the admin panel to set the DON ID and subscription ID");
      console.log("   - DON ID: fun-base-sepolia");
      console.log("   - Subscription ID: (your subscription ID)");
    } else {
      console.log("\n❌ Connection setup is incomplete or incorrect!");
      console.log(`Is authorized caller: ${isAuthorizedFinal}`);
      console.log(`Current verifier: ${currentVerifierFinal}`);
      console.log(`Expected verifier: ${CHAINLINK_VERIFIER_ADDRESS}`);
    }
  } catch (error) {
    console.error("Error verifying setup:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 