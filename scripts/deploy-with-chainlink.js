// Combined deployment script with Chainlink Functions integration
// This script:
// 1. Deploys all contracts (PuzzlePoints, ChainlinkAnswerVerifier, QuestionManager)
// 2. Connects the contracts properly
// 3. Configures the ChainlinkAnswerVerifier with source code and subscription details
// 4. Provides detailed output for next steps

const hre = require("hardhat");
const { saveAddresses } = require("./deployed-addresses");
require('dotenv').config();

// Get Chainlink config from environment
const DON_ID = process.env.CHAINLINK_DON_ID || "fun-base-sepolia";
const SUBSCRIPTION_ID = process.env.CHAINLINK_SUBSCRIPTION_ID;

// Default source code for Chainlink Functions
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
    console.error("❌ Error: CHAINLINK_SUBSCRIPTION_ID not set in .env file!");
    console.error("Please set your Chainlink Functions subscription ID in the .env file.");
    console.error("If you don't have one, create it at https://functions.chain.link/base-sepolia");
    process.exit(1);
  }

  console.log("=== AI EDUCATOR PLATFORM DEPLOYMENT WITH CHAINLINK FUNCTIONS ===\n");
  console.log("Step 1/5: Preparing for deployment...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Define user and admin addresses
  const userAddress = deployer.address;
  const adminAddress = deployer.address;

  // Step 1: Deploy PuzzlePoints token
  console.log("\nStep 2/5: Deploying contracts...");
  console.log("Deploying PuzzlePoints token...");
  const PuzzlePoints = await hre.ethers.getContractFactory("PuzzlePoints");
  const puzzlePoints = await PuzzlePoints.deploy();
  await puzzlePoints.deployed();
  console.log("✅ PuzzlePoints deployed to:", puzzlePoints.address);

  // Step 2: Deploy ChainlinkAnswerVerifier
  console.log("Deploying ChainlinkAnswerVerifier...");
  const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0"; // Base Sepolia router
  const donIdBytes32 = hre.ethers.utils.formatBytes32String(DON_ID);
  
  const ChainlinkAnswerVerifier = await hre.ethers.getContractFactory("ChainlinkAnswerVerifier");
  const verifier = await ChainlinkAnswerVerifier.deploy(routerAddress, donIdBytes32);
  await verifier.deployed();
  console.log("✅ ChainlinkAnswerVerifier deployed to:", verifier.address);

  // Step 3: Deploy QuestionManager
  console.log("Deploying QuestionManager...");
  const QuestionManager = await hre.ethers.getContractFactory("QuestionManager");
  const questionManager = await QuestionManager.deploy(puzzlePoints.address);
  await questionManager.deployed();
  console.log("✅ QuestionManager deployed to:", questionManager.address);

  // Step 4: Connect contracts
  console.log("\nStep 3/5: Connecting contracts...");
  
  // Add QuestionManager as caller in ChainlinkAnswerVerifier
  console.log("Adding QuestionManager as authorized caller in ChainlinkAnswerVerifier...");
  const addCallerTx = await verifier.addCaller(questionManager.address);
  await addCallerTx.wait();
  console.log("✅ Added QuestionManager as caller in ChainlinkAnswerVerifier");
  
  // Set AnswerVerifier in QuestionManager
  console.log("Setting ChainlinkAnswerVerifier in QuestionManager...");
  const setVerifierTx = await questionManager.setAnswerVerifier(verifier.address);
  await setVerifierTx.wait();
  console.log("✅ Set ChainlinkAnswerVerifier in QuestionManager");

  // Step 5: Configure ChainlinkAnswerVerifier
  console.log("\nStep 4/5: Configuring ChainlinkAnswerVerifier...");
  
  // Set source code
  console.log("Setting evaluation source code...");
  const setSourceTx = await verifier.updateEvaluationSource(DEFAULT_SOURCE_CODE);
  await setSourceTx.wait();
  console.log("✅ Updated evaluation source code");
  
  // Set subscription config
  console.log("Setting Chainlink Functions subscription...");
  const subscriptionIdBN = hre.ethers.BigNumber.from(SUBSCRIPTION_ID);
  const emptySecrets = "0x"; // No secrets for now
  const setConfigTx = await verifier.updateConfig(subscriptionIdBN, emptySecrets, donIdBytes32);
  await setConfigTx.wait();
  console.log("✅ Updated Chainlink Functions configuration");

  // Step 6: Mint some tokens to the deployer for testing
  console.log("\nStep 5/5: Setting up test tokens...");
  console.log("Minting PuzzlePoints tokens...");
  const tokenAmount = hre.ethers.utils.parseUnits("100", 18);
  
  // Mint tokens to user and admin addresses
  const mintTx = await puzzlePoints.mint(deployer.address, tokenAmount);
  await mintTx.wait();
  console.log(`✅ Minted ${hre.ethers.utils.formatUnits(tokenAmount, 18)} PuzzlePoints to deployer`);

  // Save deployed addresses
  const addresses = {
    PuzzlePoints: puzzlePoints.address,
    ChainlinkAnswerVerifier: verifier.address,
    QuestionManager: questionManager.address
  };
  
  // Get the current network
  const networkName = hre.network.name;
  saveAddresses(networkName, addresses);

  // Success message and next steps
  console.log("\n=== DEPLOYMENT SUCCESSFUL! ===");
  console.log("\n📄 Contract Addresses:");
  console.log("PuzzlePoints:", puzzlePoints.address);
  console.log("ChainlinkAnswerVerifier:", verifier.address);
  console.log("QuestionManager:", questionManager.address);
  
  console.log("\n🔍 Verify contracts with:");
  console.log(`npx hardhat verify --network baseSepoliaTestnet ${puzzlePoints.address}`);
  console.log(`npx hardhat verify --network baseSepoliaTestnet ${verifier.address} "${routerAddress}" "${donIdBytes32}"`);
  console.log(`npx hardhat verify --network baseSepoliaTestnet ${questionManager.address} "${puzzlePoints.address}"`);
  
  console.log("\n⚠️ IMPORTANT: Add ChainlinkAnswerVerifier as a consumer to your subscription");
  console.log("1. Go to: https://functions.chain.link/base-sepolia");
  console.log("2. Find your subscription ID:", SUBSCRIPTION_ID);
  console.log("3. Add consumer address:", verifier.address);
  
  console.log("\n🚀 Next steps:");
  console.log("1. Run 'node scripts/update-config.js baseSepoliaTestnet' to update the frontend");
  console.log("2. Start your React app with 'npm start'");
  console.log("3. Ensure your wallet is connected to Base Sepolia (Chain ID: 84532)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  }); 