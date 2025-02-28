// AI Educator Platform deployment script for Base Sepolia Testnet
const hre = require("hardhat");
const { saveAddresses } = require("./deployed-addresses");

async function main() {
  console.log("Deploying contracts to Base Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Define user and admin addresses - in production, you'd set these to your own addresses
  const userAddress = deployer.address; // Set to your test user address for testnet
  const adminAddress = deployer.address; // Set to your admin address for testnet

  // Step 1: Deploy PuzzlePoints token
  console.log("Deploying PuzzlePoints token...");
  const PuzzlePoints = await hre.ethers.getContractFactory("PuzzlePoints");
  const puzzlePoints = await PuzzlePoints.deploy();
  await puzzlePoints.deployed();
  console.log("PuzzlePoints deployed to:", puzzlePoints.address);

  // Step 2: Deploy ChainlinkAnswerVerifier (with placeholder router address for now)
  // In a real deployment, you would use the actual Chainlink Functions router address
  console.log("Deploying ChainlinkAnswerVerifier...");
  const routerAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual router in production
  const donId = hre.ethers.utils.formatBytes32String("dev-donid"); // Replace with actual DON ID in production
  
  const ChainlinkAnswerVerifier = await hre.ethers.getContractFactory("ChainlinkAnswerVerifier");
  const verifier = await ChainlinkAnswerVerifier.deploy(routerAddress, donId);
  await verifier.deployed();
  console.log("ChainlinkAnswerVerifier deployed to:", verifier.address);

  // Step 3: Deploy QuestionManager (with PuzzlePoints address)
  console.log("Deploying QuestionManager...");
  const QuestionManager = await hre.ethers.getContractFactory("QuestionManager");
  const questionManager = await QuestionManager.deploy(puzzlePoints.address);
  await questionManager.deployed();
  console.log("QuestionManager deployed to:", questionManager.address);

  // Step 4: Connect contracts together
  console.log("Connecting contracts...");
  
  // Add QuestionManager as caller in ChainlinkAnswerVerifier
  await verifier.addCaller(questionManager.address);
  console.log("Added QuestionManager as caller in ChainlinkAnswerVerifier");
  
  // Set AnswerVerifier in QuestionManager
  await questionManager.setAnswerVerifier(verifier.address);
  console.log("Set AnswerVerifier in QuestionManager");

  // Step 5: Mint some PuzzlePoints to deployer address for testing
  console.log("Minting PuzzlePoints tokens...");
  const tokenAmount = hre.ethers.utils.parseUnits("100", 18); // 100 tokens with 18 decimals
  
  // Mint tokens to user and admin addresses (which might be the same on testnet)
  if (userAddress !== deployer.address) {
    await puzzlePoints.mint(userAddress, tokenAmount);
    console.log(`Minted ${hre.ethers.utils.formatUnits(tokenAmount, 18)} PuzzlePoints to user: ${userAddress}`);
  }
  
  if (adminAddress !== deployer.address) {
    await puzzlePoints.mint(adminAddress, tokenAmount);
    console.log(`Minted ${hre.ethers.utils.formatUnits(tokenAmount, 18)} PuzzlePoints to admin: ${adminAddress}`);
  }
  
  // Always mint to deployer for testing
  await puzzlePoints.mint(deployer.address, tokenAmount);
  console.log(`Minted ${hre.ethers.utils.formatUnits(tokenAmount, 18)} PuzzlePoints to deployer: ${deployer.address}`);

  // Save deployed addresses to a file for easy access
  const addresses = {
    PuzzlePoints: puzzlePoints.address,
    ChainlinkAnswerVerifier: verifier.address,
    QuestionManager: questionManager.address
  };
  
  // Get the current network
  const networkName = hre.network.name;
  saveAddresses(networkName, addresses);

  console.log("\nDeployment complete!");
  console.log("PuzzlePoints:", puzzlePoints.address);
  console.log("ChainlinkAnswerVerifier:", verifier.address);
  console.log("QuestionManager:", questionManager.address);
  console.log("\nVerify contracts with:");
  console.log(`npx hardhat verify --network baseSepoliaTestnet ${puzzlePoints.address}`);
  console.log(`npx hardhat verify --network baseSepoliaTestnet ${verifier.address} "${routerAddress}" "${donId}"`);
  console.log(`npx hardhat verify --network baseSepoliaTestnet ${questionManager.address} "${puzzlePoints.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 