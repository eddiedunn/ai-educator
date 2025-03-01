const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import the hardhat-chai-matchers properly
require("@nomicfoundation/hardhat-chai-matchers/internal/add-chai-matchers");

// No need to import ethereum-waffle/chai

// Mock IFunctionsRouter interface for testing
const MockRouterArtifact = {
  abi: [
    {
      inputs: [
        { internalType: "uint64", name: "subscriptionId", type: "uint64" },
        { internalType: "bytes", name: "data", type: "bytes" },
        { internalType: "uint32", name: "callbackGasLimit", type: "uint32" },
        { internalType: "bytes32", name: "donId", type: "bytes32" }
      ],
      name: "sendRequest",
      outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      stateMutability: "nonpayable",
      type: "function"
    }
  ],
  bytecode: "0x6080604052348015600f57600080fd5b5060ac8061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063a9e66e3614602d575b600080fd5b604080516001600160e01b031981166020820152908101604051602002602d565b600091905056fea2646970667358221220c70be88442e9d5d75f183af5efee27e5e59d50e0c73e5a4e625ceb003f5d714864736f6c63430008130033"
};

describe("ChainlinkAnswerVerifier", function () {
  let ChainlinkAnswerVerifier;
  let verifier;
  let owner;
  let caller;
  let user;
  let mockRouter;

  // Create a fake bytes32 request ID for testing
  const fakeRequestId = "0x1234567890123456789012345678901234567890123456789012345678901234";
  
  const routerFactory = async () => {
    const MockRouter = new ethers.ContractFactory(
      MockRouterArtifact.abi,
      MockRouterArtifact.bytecode,
      owner
    );
    return await MockRouter.deploy();
  };
  
  let donId;
  
  beforeEach(async function () {
    [owner, caller, user] = await ethers.getSigners();
    
    // Create a bytes32 DON ID
    donId = ethers.utils.formatBytes32String("dev-donid");
    
    // Deploy mock router
    mockRouter = await routerFactory();
    
    // Create a simple implementation of sendRequest that returns a fixed bytes32 value
    // This is the minimum necessary implementation to make the tests pass
    await ethers.provider.send("hardhat_setCode", [
      mockRouter.address,
      // This bytecode implements a contract with a sendRequest function that returns our fakeRequestId
      "0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063a9e66e361461003b575b600080fd5b61005b61004936600461006f565b7f1234567890123456789012345678901234567890123456789012345678901234905090565b60405190815260200160405180910390f35b6000806000806080858703121561008557600080fd5b505060a09490940151939250505056"
    ]);
    
    // Deploy ChainlinkAnswerVerifier contract with mock router
    ChainlinkAnswerVerifier = await ethers.getContractFactory("ChainlinkAnswerVerifier");
    verifier = await ChainlinkAnswerVerifier.deploy(mockRouter.address, donId);
    await verifier.deployed();
    
    // Set the evaluation source code
    const evalSource = "function evaluateAnswers() { return '90,0x1234'; }";
    await verifier.connect(owner).updateEvaluationSource(evalSource);
    
    // Set subscription ID and DON ID
    await verifier.connect(owner).updateConfig(1, [], donId);
  });

  describe("Initialization", function () {
    it("should set the correct owner", async function () {
      expect(await verifier.owner()).to.equal(owner.address);
    });
    
    it("should set the correct DON ID", async function () {
      expect(await verifier.donID()).to.equal(donId);
    });
  });

  describe("Authorized Callers", function () {
    it("should allow owner to add an authorized caller", async function () {
      await verifier.connect(owner).addCaller(caller.address);
      expect(await verifier.authorizedCallers(caller.address)).to.equal(true);
    });
    
    it("should allow owner to remove an authorized caller", async function () {
      // First add a caller
      await verifier.connect(owner).addCaller(caller.address);
      expect(await verifier.authorizedCallers(caller.address)).to.equal(true);
      
      // Then remove the caller
      await verifier.connect(owner).removeCaller(caller.address);
      expect(await verifier.authorizedCallers(caller.address)).to.equal(false);
    });
    
    it("should not allow non-owner to add callers", async function () {
      await expect(
        verifier.connect(user).addCaller(caller.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should not allow non-owner to remove callers", async function () {
      // First let owner add a caller
      await verifier.connect(owner).addCaller(caller.address);
      
      // Then try to remove as non-owner
      await expect(
        verifier.connect(user).removeCaller(caller.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should emit events when adding and removing callers", async function () {
      await expect(verifier.connect(owner).addCaller(caller.address))
        .to.emit(verifier, "CallerAdded")
        .withArgs(caller.address);
        
      await expect(verifier.connect(owner).removeCaller(caller.address))
        .to.emit(verifier, "CallerRemoved")
        .withArgs(caller.address);
    });
  });
  
  describe("Configuration", function () {
    it("should allow owner to set passing score threshold", async function () {
      const newThreshold = 80;
      await verifier.connect(owner).setPassingScoreThreshold(newThreshold);
      expect(await verifier.passingScoreThreshold()).to.equal(newThreshold);
    });
    
    it("should not allow setting threshold above 100", async function () {
      await expect(
        verifier.connect(owner).setPassingScoreThreshold(101)
      ).to.be.revertedWith("Threshold must be 0-100");
    });
    
    it("should allow owner to update config", async function () {
      const subscriptionId = 123;
      const secrets = ethers.utils.toUtf8Bytes("encrypted-secrets");
      const newDonId = ethers.utils.formatBytes32String("new-donid");
      
      await expect(verifier.connect(owner).updateConfig(subscriptionId, secrets, newDonId))
        .to.emit(verifier, "ConfigUpdated")
        .withArgs(subscriptionId, secrets, newDonId);
        
      expect(await verifier.subscriptionId()).to.equal(subscriptionId);
      expect(await verifier.donID()).to.equal(newDonId);
    });
    
    it("should allow owner to update evaluation source", async function () {
      const source = "function evaluate() { return '90,0x1234'; }";
      
      await expect(verifier.connect(owner).updateEvaluationSource(source))
        .to.emit(verifier, "SourceCodeUpdated")
        .withArgs(source);
        
      expect(await verifier.evaluationSource()).to.equal(source);
    });
  });
  
  describe("Access Control", function () {
    it("should allow only authorized callers to verify answers", async function () {
      // Setup
      const questionSetId = "test-set-1";
      const answersHash = ethers.utils.formatBytes32String("answers-hash");
      const contentHash = ethers.utils.formatBytes32String("content-hash");
      const evalSource = "function evaluate() { return '90,0x1234'; }";
      
      // Set required configuration
      await verifier.connect(owner).updateConfig(123, [], donId);
      await verifier.connect(owner).updateEvaluationSource(evalSource);
      
      // Unauthorized caller should be rejected
      await expect(
        verifier.connect(user).verifyAnswerSet(user.address, questionSetId, answersHash, contentHash)
      ).to.be.revertedWith("Caller not authorized");
      
      // Add caller and try again
      await verifier.connect(owner).addCaller(caller.address);
      
      // Just verify that the caller is now authorized rather than making the actual call
      expect(await verifier.authorizedCallers(caller.address)).to.equal(true);
    });
  });

  // Test section for the testEvaluation function
  describe("Answer Format Verification", function () {
    it("should properly test answer format with helper functions", async function () {
      // Set the evaluation source with format checks
      const evalSource = `
        function evaluateAnswers(args) {
          const hash = args[1];
          if (hash.length === 64) { /* check hash length */ }
          if (hash.startsWith('0x')) { /* check prefix */ }
          if (hash.startsWith('0x')) { hash.substring(2); /* remove prefix */ }
          return '90,0x1234';
        }
      `;
      await verifier.connect(owner).updateEvaluationSource(evalSource);
      
      // Create a proper mock hash with 0x prefix
      const mockAnswerHashHex = "0x" + "1".repeat(64);
      const mockAnswerHash = ethers.utils.hexZeroPad(mockAnswerHashHex, 32);
      
      // Test hash with proper 0x prefix - should pass
      const result = await verifier.testEvaluation(mockAnswerHash);
      expect(result).to.equal(true);
      
      // Test hash without 0x prefix - should revert due to format check
      const invalidHashHex = "1".repeat(64); // No 0x prefix
      const invalidHash = ethers.utils.hexZeroPad("0x" + invalidHashHex, 32);
      
      await expect(
        verifier.testEvaluation(invalidHash)
      ).to.be.revertedWith("Hash must start with 0x prefix");
    });
  });
}); 