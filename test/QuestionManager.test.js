const { expect } = require("chai");
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
    await puzzlePoints.connect(owner).transferOwnership(questionManager.address);
    
    // Set verifier on QuestionManager
    await questionManager.connect(owner).setAnswerVerifier(verifier.address);
    
    // Disable Chainlink Functions for testing
    await questionManager.connect(owner).setUseChainlinkFunctions(false);
    
    // Set the evaluation source code for the verifier
    const evalSource = "function evaluate() { return '90,0x1234'; }";
    await verifier.connect(owner).updateEvaluationSource(evalSource);
    
    // Update the configuration with a subscription ID
    await verifier.connect(owner).updateConfig(1, "0x", donId);
    
    // Submit a question set for testing
    await questionManager.connect(owner).submitQuestionSetHash("test-questions", testContentHash, 10);
  });

  describe("Initialization", function () {
    it("should set the correct owner", async function () {
      expect(await questionManager.owner()).to.equal(owner.address);
    });
    
    it("should set the correct PuzzlePoints token", async function () {
      expect(await questionManager.puzzlePoints()).to.equal(puzzlePoints.address);
    });
    
    it("should have the correct initial passing score threshold", async function () {
      expect(await questionManager.passingScoreThreshold()).to.equal(70);
    });
  });

  describe("Question Set Management", function () {
    it("should allow owner to submit a question set", async function () {
      const timestamp = await getBlockTimestamp();
      await expect(
        questionManager.connect(owner).submitQuestionSetHash(testQuestionSetId, testContentHash, 10)
      ).to.emit(questionManager, "QuestionSetSubmitted")
       .withArgs(testQuestionSetId, testContentHash, 10, (actual) => {
          // Allow a small difference in timestamps
          return Math.abs(actual - timestamp) <= 2;
       });
      
      // Verify question set was stored
      const metadata = await questionManager.getQuestionSetMetadata(testQuestionSetId);
      expect(metadata.setId).to.equal(testQuestionSetId);
      expect(metadata.contentHash).to.equal(testContentHash);
      expect(metadata.questionCount).to.equal(10);
      expect(metadata.active).to.equal(true);
    });
    
    it("should not allow non-owner to submit a question set", async function () {
      await expect(
        questionManager.connect(user1).submitQuestionSetHash(testQuestionSetId, testContentHash, 10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should allow owner to deactivate/activate a question set", async function () {
      // First submit a question set
      await questionManager.connect(owner).submitQuestionSetHash(testQuestionSetId, testContentHash, 10);
      
      // Deactivate the question set
      await questionManager.connect(owner).deactivateQuestionSet(testQuestionSetId);
      
      // Verify it's inactive
      const inactiveMetadata = await questionManager.getQuestionSetMetadata(testQuestionSetId);
      expect(inactiveMetadata.active).to.equal(false);
      
      // Activate it again
      await questionManager.connect(owner).activateQuestionSet(testQuestionSetId);
      
      // Verify it's active
      const activeMetadata = await questionManager.getQuestionSetMetadata(testQuestionSetId);
      expect(activeMetadata.active).to.equal(true);
    });
    
    it("should allow retrieval of all question set IDs", async function () {
      // Submit two question sets
      await questionManager.connect(owner).submitQuestionSetHash("set1", testContentHash, 5);
      await questionManager.connect(owner).submitQuestionSetHash("set2", testContentHash, 10);
      
      // Get all sets
      const allSets = await questionManager.getQuestionSets();
      expect(allSets.length).to.equal(3);
      expect(allSets[1]).to.equal("set1");
      expect(allSets[2]).to.equal("set2");
    });
    
    it("should allow retrieval of only active question sets", async function () {
      // Submit two question sets
      await questionManager.connect(owner).submitQuestionSetHash("set1", testContentHash, 5);
      await questionManager.connect(owner).submitQuestionSetHash("set2", testContentHash, 10);
      
      // Deactivate one
      await questionManager.connect(owner).deactivateQuestionSet("set1");
      
      // Get active sets
      const activeSets = await questionManager.getActiveQuestionSets();
      expect(activeSets.length).to.equal(2);
      expect(activeSets[0]).to.equal("test-questions");
      expect(activeSets[1]).to.equal("set2");
    });
  });

  describe("User Assessment", function () {
    beforeEach(async function () {
      // Create a question set for tests
      await questionManager.connect(owner).submitQuestionSetHash(testQuestionSetId, testContentHash, 10);
      
      // Set evaluation source code for the verifier
      const evalSource = "function evaluate() { return '90,0x1234'; }";
      await verifier.connect(owner).updateEvaluationSource(evalSource);
      
      // Set subscription ID required for verification
      await verifier.connect(owner).updateConfig(123, [], ethers.utils.formatBytes32String("dev-donid"));
    });
    
    it("should allow users to start an assessment", async function () {
      const timestamp = await getBlockTimestamp();
      await expect(
        questionManager.connect(user1).startAssessment(testQuestionSetId)
      ).to.emit(questionManager, "AssessmentStarted")
       .withArgs(user1.address, testQuestionSetId, (actual) => {
          // Allow a small difference in timestamps
          return Math.abs(actual - timestamp) <= 2;
       });
      
      // Check assessment was created
      const status = await questionManager.getUserAssessmentStatus(user1.address);
      expect(status.hasAssessment).to.equal(true);
      expect(status.questionSetId).to.equal(testQuestionSetId);
      expect(status.completed).to.equal(false);
    });
    
    it("should allow users to submit answers", async function () {
      // Start assessment
      await questionManager.connect(user1).startAssessment(testQuestionSetId);
      
      // Get the current block timestamp for assertion
      const timestamp = await getBlockTimestamp();

      // Submit answers
      await expect(
        questionManager.connect(user1).submitAnswers(testAnswersHash)
      ).to.emit(questionManager, "AnswersSubmitted")
       .withArgs(user1.address, testAnswersHash, (actual) => {
          // Allow a small difference in timestamps
          return Math.abs(actual - timestamp) <= 2;
       });
      
      // Check answers were recorded
      const assessment = await questionManager.getUserAssessment(user1.address);
      expect(assessment.answersHash).to.equal(testAnswersHash);
    });
    
    it("should allow owner to submit evaluation results", async function () {
      // Setup: start assessment and submit answers
      await questionManager.connect(user1).startAssessment(testQuestionSetId);
      await questionManager.connect(user1).submitAnswers(testAnswersHash);
      
      // Score above passing threshold
      const score = 85;
      
      // Owner submits evaluation
      const timestamp = await getBlockTimestamp();
      await expect(
        questionManager.connect(owner).submitEvaluationResults(user1.address, testResultsHash, score)
      ).to.emit(questionManager, "AssessmentCompleted")
       .withArgs(user1.address, testResultsHash, score, (actual) => {
          // Allow a small difference in timestamps
          return Math.abs(actual - timestamp) <= 2;
       });
      
      // Check assessment was marked completed
      const assessment = await questionManager.getUserAssessment(user1.address);
      expect(assessment.completed).to.equal(true);
      expect(assessment.score).to.equal(score);
      expect(assessment.resultsHash).to.equal(testResultsHash);
      
      // Check tokens were minted (score * MAX_REWARD_AMOUNT / 100)
      const expectedTokens = ethers.BigNumber.from(10).pow(18).mul(score).div(100);
      expect(await puzzlePoints.balanceOf(user1.address)).to.equal(expectedTokens);
    });
    
    it("should allow users to restart their assessment", async function () {
      // Start assessment
      await questionManager.connect(user1).startAssessment(testQuestionSetId);
      
      // Check assessment exists
      const beforeStatus = await questionManager.getUserAssessmentStatus(user1.address);
      expect(beforeStatus.hasAssessment).to.equal(true);
      
      // Restart assessment
      await questionManager.connect(user1).restartAssessment();
      
      // Check assessment was reset
      const afterStatus = await questionManager.getUserAssessmentStatus(user1.address);
      expect(afterStatus.hasAssessment).to.equal(false);
    });
  });

  describe("Configuration", function () {
    it("should allow owner to change passing score threshold", async function () {
      const newThreshold = 75;
      await questionManager.connect(owner).setPassingScoreThreshold(newThreshold);
      expect(await questionManager.passingScoreThreshold()).to.equal(newThreshold);
    });
    
    it("should not allow threshold above 100", async function () {
      await expect(
        questionManager.connect(owner).setPassingScoreThreshold(101)
      ).to.be.revertedWith("Threshold must be between 0 and 100");
    });
    
    it("should allow owner to change PuzzlePoints contract", async function () {
      // Deploy a new token
      const PuzzlePointsFactory = await ethers.getContractFactory("PuzzlePoints");
      const newToken = await PuzzlePointsFactory.deploy();
      await newToken.deployed();
      
      // Update the token in QuestionManager
      await questionManager.connect(owner).setPuzzlePoints(newToken.address);
      
      // Verify it was updated
      expect(await questionManager.puzzlePoints()).to.equal(newToken.address);
    });
  });
}); 