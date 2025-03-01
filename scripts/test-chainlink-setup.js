const { ethers } = require("hardhat");
const { testChainlinkSetup } = require("../src/utils/contractTestUtils");
const colors = require("colors");

async function main() {
  console.log(colors.cyan("\n🔄 TESTING CHAINLINK FUNCTIONS SETUP\n"));
  
  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`Using address: ${colors.green(signer.address)}`);
    
    // Get deployed contract addresses from environment variables
    const questionManagerAddress = process.env.QUESTION_MANAGER_ADDRESS;
    const verifierAddress = process.env.CHAINLINK_VERIFIER_ADDRESS;
    
    if (!questionManagerAddress) {
      console.log(colors.red("❌ ERROR: QUESTION_MANAGER_ADDRESS not set in environment"));
      return;
    }
    
    // If verifier address isn't in env, try to get it from QuestionManager
    let resolvedVerifierAddress = verifierAddress;
    if (!resolvedVerifierAddress) {
      console.log(colors.yellow("⚠️ CHAINLINK_VERIFIER_ADDRESS not set in environment"));
      console.log("Attempting to get verifier address from QuestionManager...");
      
      const QuestionManager = await ethers.getContractFactory("QuestionManager");
      const questionManager = await QuestionManager.attach(questionManagerAddress);
      resolvedVerifierAddress = await questionManager.verifier();
      
      if (!resolvedVerifierAddress || resolvedVerifierAddress === ethers.constants.AddressZero) {
        console.log(colors.red("❌ ERROR: Could not resolve verifier address"));
        return;
      }
      
      console.log(`Retrieved verifier address: ${colors.green(resolvedVerifierAddress)}`);
    }
    
    console.log(`QuestionManager: ${colors.green(questionManagerAddress)}`);
    console.log(`ChainlinkAnswerVerifier: ${colors.green(resolvedVerifierAddress)}`);
    
    // Run the test
    console.log(colors.cyan("\n🔍 Running comprehensive setup test...\n"));
    const result = await testChainlinkSetup(signer, {
      questionManager: questionManagerAddress,
      chainlinkVerifier: resolvedVerifierAddress
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