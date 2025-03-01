// Script to update ChainlinkAnswerVerifier with source code, DON ID, and subscription ID
const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read address from addresses.json
function getContractAddress() {
  try {
    const addressesPath = path.join(__dirname, '..', 'deployments', 'addresses.json');
    const addressesJSON = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    
    const networkName = network.name;
    console.log(`Network: ${networkName}`);
    
    if (addressesJSON[networkName]) {
      const verifierAddress = addressesJSON[networkName].ChainlinkAnswerVerifier;
      if (verifierAddress) {
        console.log(`✅ Found contract address in deployments/addresses.json`);
        return verifierAddress;
      }
    }
    
    // Fallback to environment variable or hardcoded address
    console.log(`⚠️ Contract address not found in addresses.json for network ${networkName}`);
    return process.env.CHAINLINK_VERIFIER_ADDRESS || "0x094112Bf48270b426c9bE043ee002CbBF6AB813D";
  } catch (error) {
    console.log(`⚠️ Error reading addresses.json: ${error.message}`);
    return process.env.CHAINLINK_VERIFIER_ADDRESS || "0x094112Bf48270b426c9bE043ee002CbBF6AB813D";
  }
}

// Contract address
const CHAINLINK_VERIFIER_ADDRESS = getContractAddress();

// Get these values from command line or .env
const DON_ID = process.env.CHAINLINK_DON_ID || "fun-base-sepolia";
const SUBSCRIPTION_ID = process.env.CHAINLINK_SUBSCRIPTION_ID;

// Default evaluation source code (simplified for testing)
const DEFAULT_SOURCE_CODE = `
// This is a sample evaluation function for Chainlink Functions
// It takes the answers and question set hashes and returns a score

// The args parameter contains:
// - args[0]: questionSetId
// - args[1]: answersHash (as string)
// - args[2]: questionSetContentHash (as string)

function evaluateAnswers(questionText, userAnswer) {
  // In a production environment, this would use a real AI evaluation
  // to assess the quality of the answer based on the question
  
  // Score on a scale of 0-100
  if (userAnswer.length > 100) {
    return 85; // Longer answers get a good base score
  } else if (userAnswer.length > 50) {
    return 70; // Medium length answers get an average score
  } else {
    return 50; // Short answers get a minimum passing score
  }
}

function chainlinkFunction(args) {
  // For the demo, we'll just return a simulated score
  // In production, you would:
  // 1. Use the hashes to fetch the actual content from IPFS or your storage solution
  // 2. Parse the questions and answers
  // 3. Evaluate each answer and calculate an overall score
  
  // Extract arguments
  const questionSetId = args[0];
  const answersHash = args[1];
  const questionSetHash = args[2];
  
  console.log(\`Evaluating answers for question set \${questionSetId}\`);
  console.log(\`Answer hash: \${answersHash}\`);
  console.log(\`Question set hash: \${questionSetHash}\`);
  
  // Simulate a score between 75-95 for demo purposes
  const baseScore = 75;
  const randomBonus = Math.floor(Math.random() * 20);
  const score = baseScore + randomBonus;
  
  // Generate a mock results hash
  const resultsHash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  
  // Return score and results hash as a comma-separated string
  return score.toString() + "," + resultsHash;
}
`;

async function main() {
  if (!SUBSCRIPTION_ID) {
    console.error("❌ Error: CHAINLINK_SUBSCRIPTION_ID not set!");
    console.error("Please set it in your .env file or pass it as an argument.");
    console.error("Example: CHAINLINK_SUBSCRIPTION_ID=1234 npx hardhat run scripts/update-chainlink-config.js --network baseSepoliaTestnet");
    process.exit(1);
  }

  console.log("Updating ChainlinkAnswerVerifier configuration...");
  console.log(`DON ID: ${DON_ID}`);
  console.log(`Subscription ID: ${SUBSCRIPTION_ID}`);
  console.log(`Contract Address: ${CHAINLINK_VERIFIER_ADDRESS}`);
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Get contract instance
  const ChainlinkAnswerVerifier = await ethers.getContractFactory("ChainlinkAnswerVerifier");
  const verifier = ChainlinkAnswerVerifier.attach(CHAINLINK_VERIFIER_ADDRESS);
  
  // Check ownership
  const owner = await verifier.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(`\n❌ Error: You (${deployer.address}) are not the owner of this contract!`);
    console.error(`Contract owner is: ${owner}`);
    console.error("Please run this script with the owner's private key.");
    process.exit(1);
  }
  
  // Step 1: Update the source code
  console.log("\nUpdating evaluation source code...");
  try {
    const tx1 = await verifier.updateEvaluationSource(DEFAULT_SOURCE_CODE);
    console.log(`Transaction sent: ${tx1.hash}`);
    await tx1.wait();
    console.log("✅ Successfully updated source code");
  } catch (error) {
    console.error("Error updating source code:", error.message);
    process.exit(1);
  }
  
  // Step 2: Update the configuration (DON ID and subscription ID)
  console.log("\nUpdating DON ID and subscription ID...");
  try {
    // Convert DON ID to bytes32
    const donIdBytes32 = ethers.utils.formatBytes32String(DON_ID);
    
    // Convert subscription ID to uint64
    const subscriptionIdBN = ethers.BigNumber.from(SUBSCRIPTION_ID);
    
    // Empty secrets for now (use empty bytes)
    const emptySecrets = "0x";
    
    const tx2 = await verifier.updateConfig(subscriptionIdBN, emptySecrets, donIdBytes32);
    console.log(`Transaction sent: ${tx2.hash}`);
    await tx2.wait();
    console.log("✅ Successfully updated configuration");
  } catch (error) {
    console.error("Error updating configuration:", error.message);
    process.exit(1);
  }
  
  // Step 3: Verify current configuration
  console.log("\nVerifying configuration...");
  try {
    const currentDonId = await verifier.donID();
    const currentSubId = await verifier.subscriptionId();
    const sourceCodeSet = await verifier.evaluationSource();
    
    console.log(`Current DON ID: ${ethers.utils.parseBytes32String(currentDonId)}`);
    console.log(`Current Subscription ID: ${currentSubId.toString()}`);
    console.log(`Source Code Length: ${sourceCodeSet.length} characters`);
    
    if (currentSubId.toString() === SUBSCRIPTION_ID.toString()) {
      console.log("\n✅ SUCCESS: ChainlinkAnswerVerifier is properly configured!");
      console.log("\nNext steps:");
      console.log("1. Add the ChainlinkAnswerVerifier contract as a consumer in your Chainlink Functions subscription");
      console.log("   - Go to: https://functions.chain.link/base-sepolia");
      console.log(`   - Add consumer: ${CHAINLINK_VERIFIER_ADDRESS}`);
      console.log("2. Try submitting an assessment with Chainlink Functions verification");
    } else {
      console.log("\n❌ Configuration verification failed!");
    }
  } catch (error) {
    console.error("Error verifying configuration:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 