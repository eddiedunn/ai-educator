// AI Educator Platform deployment script
const hre = require("hardhat");
const { saveAddresses } = require("./deployed-addresses");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Define user and admin addresses
  const userAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"; // Hardhat's default second account
  const adminAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // Hardhat's default first account

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

  // Step 5: Mint 100 PuzzlePoints to user and admin addresses
  console.log("Minting PuzzlePoints tokens...");
  const tokenAmount = hre.ethers.utils.parseUnits("100", 18); // 100 tokens with 18 decimals
  
  // Mint tokens to user
  await puzzlePoints.mint(userAddress, tokenAmount);
  console.log(`Minted ${hre.ethers.utils.formatUnits(tokenAmount, 18)} PuzzlePoints to user: ${userAddress}`);
  
  // Mint tokens to admin
  await puzzlePoints.mint(adminAddress, tokenAmount);
  console.log(`Minted ${hre.ethers.utils.formatUnits(tokenAmount, 18)} PuzzlePoints to admin: ${adminAddress}`);

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 