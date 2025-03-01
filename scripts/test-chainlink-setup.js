const { ethers, network } = require("hardhat");
const { testChainlinkSetup } = require("../src/utils/contractTestUtils");
const colors = require("colors");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(colors.cyan("\n🔄 TESTING CHAINLINK FUNCTIONS SETUP\n"));
  
  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`Using address: ${colors.green(signer.address)}`);
    
    // Try to get addresses from addresses.json first
    let questionManagerAddress;
    let verifierAddress;
    
    try {
      // Read addresses from the JSON file
      const addressesPath = path.join(__dirname, '..', 'deployments', 'addresses.json');
      const addressesJSON = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
      
      // Get addresses for the current network
      const networkName = network.name;
      console.log(`Network: ${colors.blue(networkName)}`);
      
      if (addressesJSON[networkName]) {
        questionManagerAddress = addressesJSON[networkName].QuestionManager;
        verifierAddress = addressesJSON[networkName].ChainlinkAnswerVerifier;
        
        console.log(colors.green("✅ Found contract addresses in deployments/addresses.json"));
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
    
    // If verifier address isn't available, try to get it from QuestionManager
    if (!verifierAddress) {
      verifierAddress = process.env.CHAINLINK_VERIFIER_ADDRESS;
      
      if (!verifierAddress) {
        console.log(colors.yellow("⚠️ Verifier address not found"));
        console.log("Attempting to get verifier address from QuestionManager...");
        
        const QuestionManager = await ethers.getContractFactory("QuestionManager");
        const questionManager = await QuestionManager.attach(questionManagerAddress);
        try {
          verifierAddress = await questionManager.answerVerifier();
          
          if (!verifierAddress || verifierAddress === ethers.constants.AddressZero) {
            console.log(colors.red("❌ ERROR: Could not resolve verifier address"));
            return;
          }
          
          console.log(`Retrieved verifier address: ${colors.green(verifierAddress)}`);
        } catch (error) {
          console.log(colors.red(`❌ ERROR: Failed to get verifier address: ${error.message}`));
          return;
        }
      } else {
        console.log(colors.green("✅ Using CHAINLINK_VERIFIER_ADDRESS from environment"));
      }
    }
    
    console.log(`QuestionManager: ${colors.green(questionManagerAddress)}`);
    console.log(`ChainlinkAnswerVerifier: ${colors.green(verifierAddress)}`);
    
    // Run the test
    console.log(colors.cyan("\n🔍 Running comprehensive setup test...\n"));
    const result = await testChainlinkSetup(signer, {
      questionManager: questionManagerAddress,
      chainlinkVerifier: verifierAddress
    });
    
    // Display results
    if (result.success) {
      console.log(colors.green("\n✅ CHAINLINK SETUP TEST PASSED!"));
      console.log(colors.green("All components are correctly configured."));
    } else {
      console.log(colors.red("\n❌ CHAINLINK SETUP TEST FAILED!"));
      console.log(colors.red("The following issues were found:"));
      
      result.errors.forEach((error, index) => {
        console.log(colors.red(`  ${index + 1}. ${error}`));
      });
      
      console.log(colors.yellow("\n🔧 SUGGESTED FIXES:"));
      
      if (result.errors.some(e => e.includes("authorized"))) {
        console.log(colors.yellow("• Run: npx hardhat setup-chainlink-connection --network baseSepoliaTestnet"));
      }
      
      if (result.errors.some(e => e.includes("source") || e.includes("Subscription ID") || e.includes("DON ID"))) {
        console.log(colors.yellow("• Run: npx hardhat update-chainlink --network baseSepoliaTestnet"));
      }
      
      if (result.errors.some(e => e.includes("verifier not set"))) {
        console.log(colors.yellow("• Run: npx hardhat setup-chainlink --network baseSepoliaTestnet"));
      }
    }
    
    console.log(colors.cyan("\n📋 OVERALL STATUS:"));
    console.log(`Chainlink Functions setup: ${result.success ? colors.green("✅ READY") : colors.red("❌ NOT READY")}`);
    
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