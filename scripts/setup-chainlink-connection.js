// Script to properly set up the connection between QuestionManager and ChainlinkAnswerVerifier
// This script needs to be run once to establish the initial connection
const { ethers } = require("hardhat");
require('dotenv').config();

// Contract addresses - update with your deployed addresses
const QUESTION_MANAGER_ADDRESS = "0x0cB0e4Df0Df1e000565E555b281b7084670116dE";
const CHAINLINK_VERIFIER_ADDRESS = "0x094112Bf48270b426c9bE043ee002CbBF6AB813D";

async function main() {
  console.log("Setting up connection between QuestionManager and ChainlinkAnswerVerifier...");
  
  // Get the signer (your account)
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Get contract instances
  console.log("Connecting to contracts...");
  
  const ChainlinkAnswerVerifier = await ethers.getContractFactory("ChainlinkAnswerVerifier");
  const verifier = ChainlinkAnswerVerifier.attach(CHAINLINK_VERIFIER_ADDRESS);
  
  const QuestionManager = await ethers.getContractFactory("QuestionManager");
  const questionManager = QuestionManager.attach(QUESTION_MANAGER_ADDRESS);
  
  // Step 1: Check if verifier already knows about QuestionManager
  console.log("\nChecking if QuestionManager is already an authorized caller...");
  const isAuthorized = await verifier.authorizedCallers(QUESTION_MANAGER_ADDRESS);
  
  if (isAuthorized) {
    console.log("✅ QuestionManager is already an authorized caller in ChainlinkAnswerVerifier");
  } else {
    console.log("❌ QuestionManager is not authorized. Adding as caller...");
    
    // Add QuestionManager as a caller in ChainlinkAnswerVerifier
    try {
      const tx1 = await verifier.addCaller(QUESTION_MANAGER_ADDRESS);
      console.log(`Transaction sent: ${tx1.hash}`);
      await tx1.wait();
      console.log("✅ Successfully added QuestionManager as a caller");
    } catch (error) {
      console.error("Error adding caller:", error.message);
      if (error.message.includes("Ownable: caller is not the owner")) {
        console.error("\n⚠️ You are not the owner of the ChainlinkAnswerVerifier contract!");
        console.error(`Current account: ${deployer.address}`);
        const owner = await verifier.owner();
        console.error(`Contract owner: ${owner}`);
        console.error("Please run this script with the contract owner's private key.");
      }
      process.exit(1);
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
          console.error(`Current account: ${deployer.address}`);
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
    const isAuthorizedFinal = await verifier.authorizedCallers(QUESTION_MANAGER_ADDRESS);
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