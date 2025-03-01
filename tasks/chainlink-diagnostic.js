const { task, types } = require("hardhat/config");
const { testChainlinkSetup } = require("../src/utils/contractTestUtils");
const ethers = require("ethers");

task("chainlink:diagnose", "Run comprehensive diagnostic tests for Chainlink setup")
  .addParam("quickonly", "Only run quick checks without gas estimation", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    console.log("====================================================");
    console.log("🔍 CHAINLINK FUNCTIONS COMPREHENSIVE DIAGNOSTIC TOOL");
    console.log("====================================================");
    
    try {
      const { quickonly } = taskArgs;
      const network = hre.network.name;
      
      console.log(`Running on network: ${network}`);
      
      // Get signer
      const [signer] = await hre.ethers.getSigners();
      console.log(`Using signer address: ${signer.address}`);
      
      // Get deployed contracts
      const QuestionManager = await hre.ethers.getContractFactory("QuestionManager");
      const ChainlinkAnswerVerifier = await hre.ethers.getContractFactory("ChainlinkAnswerVerifier");
      
      // Load deployed contract addresses
      const questionManagerAddress = (await hre.deployments.get("QuestionManager")).address;
      const verifierAddress = (await hre.deployments.get("ChainlinkAnswerVerifier")).address;
      
      console.log(`QuestionManager deployed at: ${questionManagerAddress}`);
      console.log(`ChainlinkAnswerVerifier deployed at: ${verifierAddress}`);
      
      // Create contract instances
      const questionManager = await QuestionManager.attach(questionManagerAddress);
      const verifier = await ChainlinkAnswerVerifier.attach(verifierAddress);
      
      // Run the diagnostic tests
      console.log("\nRunning Chainlink setup diagnostic tests...");
      const results = await testChainlinkSetup(signer, {
        questionManager: questionManagerAddress,
        chainlinkVerifier: verifierAddress
      });
      
      // If quick checks passed and we're not in quick-only mode, do additional gas estimation tests
      if (results.success && !quickonly) {
        console.log("\n====================================================");
        console.log("⛽ RUNNING GAS ESTIMATION TESTS");
        console.log("====================================================");
        
        try {
          // Get a test question set ID
          const filter = questionManager.filters.QuestionSetCreated();
          const events = await questionManager.queryFilter(filter);
          
          if (events.length === 0) {
            console.log("❌ No question sets found for testing");
            console.log("Please create a question set first with: npx hardhat create-question-set");
            return;
          }
          
          // Use the most recent question set
          const questionSetId = events[events.length - 1].args.setId;
          console.log(`Using question set ID: ${questionSetId}`);
          
          // Generate a test answer hash
          const testAnswerHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(JSON.stringify({
              answers: [{ questionId: 0, answer: "Test answer for diagnostic" }],
              timestamp: new Date().toISOString()
            }))
          );
          
          console.log(`Test answer hash: ${testAnswerHash}`);
          
          // Get verification method
          const questionSet = await questionManager.questionSets(questionSetId);
          const verificationMethod = questionSet.useChainlinkFunctions ? "chainlink" : "manual";
          
          console.log(`Verification method: ${verificationMethod}`);
          
          if (verificationMethod !== "chainlink") {
            console.log("❌ The selected question set does not use Chainlink Functions");
            console.log("Please create a question set with Chainlink verification enabled");
            return;
          }
          
          // Check if the user already has a pending assessment
          const userAddress = signer.address;
          const assessment = await questionManager.userAssessments(userAddress);
          
          if (assessment.completed) {
            console.log("⚠️ You already have a completed assessment for this question set");
            console.log("Resetting it for testing purposes...");
            
            await questionManager.startAssessment(questionSetId);
            console.log("✅ Assessment reset successfully");
          }
          
          // Now try to estimate gas for the submission
          console.log("\nEstimating gas for submitAnswers...");
          try {
            const estimatedGas = await questionManager.estimateGas.submitAnswers(testAnswerHash);
            console.log(`✅ Gas estimation successful: ${estimatedGas.toString()} gas units`);
            console.log("\nYou can submit an assessment with this command:");
            console.log(`npx hardhat submit-assessment --network ${network} --question-set-id ${questionSetId} --answers-hash 0x${testAnswerHash.slice(2)}`);
          } catch (error) {
            console.error(`❌ Gas estimation failed: ${error.message}`);
            
            // Check specific errors and provide guidance
            if (error.message.includes("Caller not authorized")) {
              console.log("\n🔧 AUTHORIZATION ISSUE DETECTED");
              console.log("The QuestionManager is not authorized to call the ChainlinkAnswerVerifier");
              console.log("Fix this with: npx hardhat setup-chainlink-connection --network " + network);
            } 
            else if (error.message.includes("Source code not set")) {
              console.log("\n🔧 SOURCE CODE ISSUE DETECTED");
              console.log("The evaluation source code is not set in the ChainlinkAnswerVerifier");
              console.log("Fix this with: npx hardhat update-chainlink --network " + network);
            }
            else if (error.message.includes("Subscription ID not set")) {
              console.log("\n🔧 SUBSCRIPTION ID ISSUE DETECTED");
              console.log("The Chainlink subscription ID is not configured");
              console.log("Fix this with: npx hardhat update-chainlink --network " + network);
            }
            else {
              console.log("\n🔧 UNKNOWN ISSUE DETECTED");
              console.log("Please run these setup commands:");
              console.log("1. npx hardhat setup-chainlink --network " + network);
              console.log("2. npx hardhat setup-chainlink-connection --network " + network);
              console.log("3. npx hardhat update-chainlink --network " + network);
            }
          }
        } catch (error) {
          console.error(`❌ Error during gas estimation tests: ${error.message}`);
        }
      }
      
      console.log("\n====================================================");
      console.log("📋 SUMMARY");
      console.log("====================================================");
      
      if (results.success) {
        console.log("✅ Basic Chainlink setup tests: PASSED");
        console.log("\n🔗 IMPORTANT: Make sure your ChainlinkAnswerVerifier contract is added");
        console.log("   as a consumer in your Chainlink Functions subscription!");
      } else {
        console.log("❌ Basic Chainlink setup tests: FAILED");
        console.log("\nPlease fix the following issues:");
        results.errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
      }
      
      console.log("\n🛠️ Diagnostic Tools:");
      console.log("1. Run basic Chainlink setup diagnostics:");
      console.log(`   npx hardhat chainlink:diagnose --network ${network} --quickonly true`);
      console.log("2. Test your source code:");
      console.log("   npm run test:chainlink-source");
      console.log("3. Run gas estimation tests:");
      console.log(`   npm run test:gas-estimate`);
      
    } catch (error) {
      console.error("❌ Error running diagnostic task:", error);
    }
  });

module.exports = {}; 