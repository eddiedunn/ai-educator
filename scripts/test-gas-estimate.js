const { ethers, network } = require("hardhat");
const { submitWithGasEstimate } = require("../src/utils/contractTestUtils");
const colors = require("colors");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(colors.cyan("\n⛽ TESTING GAS ESTIMATION FOR CHAINLINK FUNCTIONS\n"));
  
  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`Using address: ${colors.green(signer.address)}`);
    
    // Try to get addresses from addresses.json first
    let questionManagerAddress;
    
    try {
      // Read addresses from the JSON file
      const addressesPath = path.join(__dirname, '..', 'deployments', 'addresses.json');
      const addressesJSON = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
      
      // Get addresses for the current network
      const networkName = network.name;
      console.log(`Network: ${colors.blue(networkName)}`);
      
      if (addressesJSON[networkName]) {
        questionManagerAddress = addressesJSON[networkName].QuestionManager;
        console.log(colors.green("✅ Found contract address in deployments/addresses.json"));
      } else {
        console.log(colors.yellow(`⚠️ No deployment found for network: ${networkName} in addresses.json`));
      }
    } catch (error) {
      console.log(colors.yellow(`⚠️ Error reading addresses.json: ${error.message}`));
    }
    
    // Fall back to environment variables if needed
    if (!questionManagerAddress) {
      questionManagerAddress = process.env.QUESTION_MANAGER_ADDRESS;
      if (questionManagerAddress) {
        console.log(colors.green("✅ Using QUESTION_MANAGER_ADDRESS from environment"));
      } else {
        console.log(colors.red("❌ ERROR: Could not find QuestionManager address"));
        console.log(colors.yellow("Please either:"));
        console.log(colors.yellow("1. Deploy contracts with 'npm run deploy:baseSepolia' or"));
        console.log(colors.yellow("2. Set QUESTION_MANAGER_ADDRESS in your .env file"));
        return;
      }
    }
    
    console.log(`QuestionManager: ${colors.green(questionManagerAddress)}`);
    
    // Create contract instance
    const QuestionManager = await ethers.getContractFactory("QuestionManager");
    const questionManager = await QuestionManager.attach(questionManagerAddress);
    
    // Generate test data
    const testQuestionSetId = 999999999; // Use a non-existent ID for testing
    const testAnswer = JSON.stringify({
      answers: [
        { questionId: 1, answer: "This is a test answer for gas estimation." }
      ],
      timestamp: new Date().toISOString()
    });
    
    // Hash the answers string to create a bytes32 hash
    const testAnswerHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(testAnswer));
    
    console.log(colors.cyan("\n📝 Using test data:"));
    console.log(`Question Set ID: ${colors.yellow(testQuestionSetId)}`);
    console.log(`Answer: ${colors.yellow(testAnswer.substring(0, 40) + "...")}`);
    console.log(`Answer Hash: ${colors.yellow(testAnswerHash)}`);
    
    // Run the gas estimation test
    console.log(colors.cyan("\n🔍 Running gas estimation test...\n"));
    
    const result = await submitWithGasEstimate(
      questionManager,
      testQuestionSetId,
      testAnswerHash
    );
    
    // Display results
    if (result.success) {
      console.log(colors.green("\n✅ GAS ESTIMATION TEST PASSED!"));
      console.log(colors.green(`Estimated gas: ${result.gasEstimate} units`));
      console.log(colors.green("Transaction would be successful."));
    } else {
      console.log(colors.red("\n❌ GAS ESTIMATION TEST FAILED!"));
      console.log(colors.red(`Error: ${result.error}`));
      
      console.log(colors.yellow("\n🔍 DETAILED DIAGNOSTICS:"));
      
      if (result.verifierStatus) {
        console.log(colors.cyan("Chainlink Verifier Status:"));
        Object.entries(result.verifierStatus).forEach(([key, value]) => {
          console.log(`  ${key}: ${colors.yellow(value.toString())}`);
        });
      }
      
      console.log(colors.yellow("\n🔧 SUGGESTED FIXES:"));
      
      if (result.error.includes("Caller not authorized")) {
        console.log(colors.yellow("• Run: npx hardhat setup-chainlink-connection --network baseSepoliaTestnet"));
      }
      
      if (result.error.includes("Source code not set") || result.error.includes("Subscription ID not set")) {
        console.log(colors.yellow("• Run: npx hardhat update-chainlink --network baseSepoliaTestnet"));
      }
      
      if (result.error.includes("Assessment is already in")) {
        console.log(colors.yellow("• This is a test error. In a real scenario, wait for verification to complete."));
      }
      
      if (result.error.includes("insufficient funds")) {
        console.log(colors.yellow("• Your wallet needs more ETH for gas. Use the Base Sepolia faucet."));
      }
    }
    
    console.log(colors.cyan("\n📋 OVERALL STATUS:"));
    console.log(`Gas estimation: ${result.success ? colors.green("✅ SUCCESSFUL") : colors.red("❌ FAILED")}`);
    console.log(colors.cyan("\n💡 NEXT STEPS:"));
    console.log("• If this test failed, run the chainlink diagnostics tool:");
    console.log("  npm run chainlink:diagnose");
    console.log("• For further details, consult the CHAINLINK-DIAGNOSTICS.md file");
    
  } catch (error) {
    console.log(colors.red(`\n❌ ERROR: ${error.message}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 