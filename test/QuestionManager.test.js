const { expect, assert } = require("chai");
const { ethers, network } = require("hardhat");

// Import the proper statements for hardhat-chai-matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Remove the ethereum-waffle configuration
// const chai = require("chai");
// const { solidity } = require("ethereum-waffle");
// chai.use(solidity);

describe("QuestionManager", function () {
  let owner, user1, user2;
  let questionManager, puzzlePoints, verifier, mockRouter;
  let testContentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test content"));
  const chainId = 1; // Localhost chain ID
  const donId = ethers.utils.formatBytes32String("don-id"); // Mock DON ID

  // Mock data for answer verification
  const answerHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("user answers"));
  const sampleRequestId = ethers.utils.formatBytes32String("sample-request-id");
  
  // Sample content hash for question sets
  const exampleContentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Example question set content"));
  
  // Define test variables 
  const testQuestionSetId = "test-question-set";
  const testAnswersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test answers"));
  const testResultsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test results"));
  
  // Helper function to get the current block timestamp
  async function getBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
  }
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy PuzzlePoints token
    const PuzzlePoints = await ethers.getContractFactory("PuzzlePoints");
    puzzlePoints = await PuzzlePoints.deploy();
    await puzzlePoints.deployed();
    
    // Deploy a mock router for Chainlink Functions
    const mockRouterAddress = ethers.utils.getContractAddress({
      from: owner.address,
      nonce: await owner.getTransactionCount() + 1
    });
    
    // Deploy the ChainlinkAnswerVerifier
    const ChainlinkAnswerVerifier = await ethers.getContractFactory("ChainlinkAnswerVerifier");
    verifier = await ChainlinkAnswerVerifier.deploy(mockRouterAddress, donId);
    await verifier.deployed();
    
    // Deploy a mock router implementation
    const MockRouter = await ethers.getContractFactory("MockRouter");
    mockRouter = await MockRouter.deploy();
    await mockRouter.deployed();
    
    // Set the mock router's code
    await network.provider.send("hardhat_setCode", [
      mockRouterAddress,
      await ethers.provider.getCode(mockRouter.address)
    ]);
    
    // Deploy QuestionManager
    const QuestionManager = await ethers.getContractFactory("QuestionManager");
    questionManager = await QuestionManager.deploy(puzzlePoints.address);
    await questionManager.deployed();
    
    // Transfer ownership of PuzzlePoints to the QuestionManager contract
    const transferTx = await puzzlePoints.connect(owner).transferOwnership(questionManager.address);
    await transferTx.wait();
    
    // Set verifier on QuestionManager
    const setVerifierTx = await questionManager.connect(owner).setAnswerVerifier(verifier.address);
    await setVerifierTx.wait();
    
    // Disable Chainlink Functions for testing
    const disableFunctionsTx = await questionManager.connect(owner).setUseChainlinkFunctions(false);
    await disableFunctionsTx.wait();
    
    // Set the evaluation source code for the verifier
    const evalSource = "function evaluate() { return '90,0x1234'; }";
    const updateSourceTx = await verifier.connect(owner).updateEvaluationSource(evalSource);
    await updateSourceTx.wait();
    
    // Update the configuration with a subscription ID
    const updateConfigTx = await verifier.connect(owner).updateConfig(1, "0x", donId);
    await updateConfigTx.wait();
    
    // Submit a question set for testing
    const submitQsTx = await questionManager.connect(owner).submitQuestionSetHash("test-questions", testContentHash, 10);
    await submitQsTx.wait();
    
    // Mine a block to ensure state updates
    await ethers.provider.send("evm_mine");
  });

  describe("Initialization", function () {
    it("should set the correct owner", async function () {
      const actualOwner = await questionManager.owner();
      assert.equal(actualOwner, owner.address);
    });
    
    it("should set the correct PuzzlePoints token", async function () {
      const pointsToken = await questionManager.puzzlePoints();
      assert.equal(pointsToken, puzzlePoints.address);
    });
    
    it("should have the correct initial passing score threshold", async function () {
      const threshold = await questionManager.passingScoreThreshold();
      assert.equal(threshold, 70);
    });
  });

  describe("Question Set Management", function () {
    it("should allow owner to submit a question set", async function () {
      // Track the event emission
      let eventEmitted = false;
      questionManager.on("QuestionSetSubmitted", 
        (id, hash, count, timestamp) => {
          if (id === testQuestionSetId && hash === testContentHash && count.toNumber() === 10) {
            eventEmitted = true;
          }
        }
      );
      
      // Submit a question set
      const submitTx = await questionManager.connect(owner).submitQuestionSetHash(testQuestionSetId, testContentHash, 10);
      await submitTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Verify question set was stored
      const metadata = await questionManager.getQuestionSetMetadata(testQuestionSetId);
      assert.equal(metadata.setId, testQuestionSetId);
      assert.equal(metadata.contentHash, testContentHash);
      assert.equal(metadata.questionCount.toString(), "10");
      assert.equal(metadata.active, true);
    });
    
    it("should not allow non-owner to submit a question set", async function () {
      // Non-owner tries to submit a question set
      let submitFailed = false;
      try {
        await questionManager.connect(user1).submitQuestionSetHash(testQuestionSetId, testContentHash, 10);
      } catch (error) {
        assert.include(error.message, "Ownable: caller is not the owner");
        submitFailed = true;
      }
      assert.isTrue(submitFailed, "Submit by non-owner should have failed");
    });
    
    it("should allow owner to deactivate/activate a question set", async function () {
      // First submit a question set
      const submitTx = await questionManager.connect(owner).submitQuestionSetHash(testQuestionSetId, testContentHash, 10);
      await submitTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Deactivate the question set
      const deactivateTx = await questionManager.connect(owner).deactivateQuestionSet(testQuestionSetId);
      await deactivateTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Verify it's inactive
      const inactiveMetadata = await questionManager.getQuestionSetMetadata(testQuestionSetId);
      assert.equal(inactiveMetadata.active, false);
      
      // Activate it again
      const activateTx = await questionManager.connect(owner).activateQuestionSet(testQuestionSetId);
      await activateTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Verify it's active
      const activeMetadata = await questionManager.getQuestionSetMetadata(testQuestionSetId);
      assert.equal(activeMetadata.active, true);
    });
    
    it("should allow retrieval of all question set IDs", async function () {
      // Submit two question sets
      const submitTx1 = await questionManager.connect(owner).submitQuestionSetHash("set1", testContentHash, 5);
      await submitTx1.wait();
      
      const submitTx2 = await questionManager.connect(owner).submitQuestionSetHash("set2", testContentHash, 10);
      await submitTx2.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Get all sets
      const allSets = await questionManager.getQuestionSets();
      assert.equal(allSets.length, 3);
      assert.equal(allSets[1], "set1");
      assert.equal(allSets[2], "set2");
    });
    
    it("should allow retrieval of only active question sets", async function () {
      // Submit two question sets
      const submitTx1 = await questionManager.connect(owner).submitQuestionSetHash("set1", testContentHash, 5);
      await submitTx1.wait();
      
      const submitTx2 = await questionManager.connect(owner).submitQuestionSetHash("set2", testContentHash, 10);
      await submitTx2.wait();
      
      // Deactivate one
      const deactivateTx = await questionManager.connect(owner).deactivateQuestionSet("set1");
      await deactivateTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Get active sets
      const activeSets = await questionManager.getActiveQuestionSets();
      assert.equal(activeSets.length, 2);
      assert.equal(activeSets[0], "test-questions");
      assert.equal(activeSets[1], "set2");
    });
  });

  describe("User Assessment", function () {
    beforeEach(async function () {
      // Create a question set for tests
      const submitTx = await questionManager.connect(owner).submitQuestionSetHash(testQuestionSetId, testContentHash, 10);
      await submitTx.wait();
      
      // Set evaluation source code for the verifier
      const evalSource = "function evaluate() { return '90,0x1234'; }";
      const updateSourceTx = await verifier.connect(owner).updateEvaluationSource(evalSource);
      await updateSourceTx.wait();
      
      // Set subscription ID required for verification
      const updateConfigTx = await verifier.connect(owner).updateConfig(123, [], ethers.utils.formatBytes32String("dev-donid"));
      await updateConfigTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
    });
    
    it("should allow users to start an assessment", async function () {
      // Track the event emission
      let eventEmitted = false;
      questionManager.on("AssessmentStarted", 
        (user, id, timestamp) => {
          if (user === user1.address && id === testQuestionSetId) {
            eventEmitted = true;
          }
        }
      );
      
      // Start assessment
      const startTx = await questionManager.connect(user1).startAssessment(testQuestionSetId);
      await startTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check assessment was created
      const status = await questionManager.getUserAssessmentStatus(user1.address);
      assert.equal(status.hasAssessment, true);
      assert.equal(status.questionSetId, testQuestionSetId);
      assert.equal(status.completed, false);
    });
    
    it("should allow users to submit answers", async function () {
      // Start assessment
      const startTx = await questionManager.connect(user1).startAssessment(testQuestionSetId);
      await startTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Track the event emission
      let eventEmitted = false;
      questionManager.on("AnswersSubmitted", 
        (user, hash, timestamp) => {
          if (user === user1.address && hash === testAnswersHash) {
            eventEmitted = true;
          }
        }
      );
      
      // Submit answers
      const submitTx = await questionManager.connect(user1).submitAnswers(testAnswersHash);
      await submitTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check answers were recorded
      const assessment = await questionManager.getUserAssessment(user1.address);
      assert.equal(assessment.answersHash, testAnswersHash);
    });
    
    it("should allow owner to submit evaluation results", async function () {
      // Setup: start assessment and submit answers
      const startTx = await questionManager.connect(user1).startAssessment(testQuestionSetId);
      await startTx.wait();
      
      const submitTx = await questionManager.connect(user1).submitAnswers(testAnswersHash);
      await submitTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Score above passing threshold
      const score = 85;
      
      // Track the event emission
      let eventEmitted = false;
      questionManager.on("AssessmentCompleted", 
        (user, hash, scoreResult, timestamp) => {
          if (user === user1.address && hash === testResultsHash && scoreResult.toNumber() === score) {
            eventEmitted = true;
          }
        }
      );
      
      // Owner submits evaluation
      const evalTx = await questionManager.connect(owner).submitEvaluationResults(user1.address, testResultsHash, score);
      await evalTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check assessment was marked completed
      const assessment = await questionManager.getUserAssessment(user1.address);
      assert.equal(assessment.completed, true);
      assert.equal(assessment.score.toString(), score.toString());
      assert.equal(assessment.resultsHash, testResultsHash);
      
      // Check tokens were minted (score * MAX_REWARD_AMOUNT / 100)
      const expectedTokens = ethers.BigNumber.from(10).pow(18).mul(score).div(100);
      const tokenBalance = await puzzlePoints.balanceOf(user1.address);
      assert.equal(tokenBalance.toString(), expectedTokens.toString());
    });
    
    it("should allow users to restart their assessment", async function () {
      // Start assessment
      const startTx = await questionManager.connect(user1).startAssessment(testQuestionSetId);
      await startTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check assessment exists
      const beforeStatus = await questionManager.getUserAssessmentStatus(user1.address);
      assert.equal(beforeStatus.hasAssessment, true);
      
      // Restart assessment
      const restartTx = await questionManager.connect(user1).restartAssessment();
      await restartTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check assessment was reset
      const afterStatus = await questionManager.getUserAssessmentStatus(user1.address);
      assert.equal(afterStatus.hasAssessment, false);
    });
  });

  describe("Configuration", function () {
    it("should allow owner to change passing score threshold", async function () {
      const newThreshold = 75;
      const thresholdTx = await questionManager.connect(owner).setPassingScoreThreshold(newThreshold);
      await thresholdTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      const actualThreshold = await questionManager.passingScoreThreshold();
      assert.equal(actualThreshold, newThreshold);
    });
    
    it("should not allow threshold above 100", async function () {
      let thresholdFailed = false;
      try {
        await questionManager.connect(owner).setPassingScoreThreshold(101);
      } catch (error) {
        assert.include(error.message, "Threshold must be between 0 and 100");
        thresholdFailed = true;
      }
      assert.isTrue(thresholdFailed, "Setting threshold above 100 should have failed");
    });
    
    it("should allow owner to change PuzzlePoints contract", async function () {
      // Deploy a new token
      const PuzzlePointsFactory = await ethers.getContractFactory("PuzzlePoints");
      const newToken = await PuzzlePointsFactory.deploy();
      await newToken.deployed();
      
      // Update the token in QuestionManager
      const updateTx = await questionManager.connect(owner).setPuzzlePoints(newToken.address);
      await updateTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Verify it was updated
      const updatedToken = await questionManager.puzzlePoints();
      assert.equal(updatedToken, newToken.address);
    });
  });
}); 