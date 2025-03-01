const { ethers } = require("hardhat");

describe("Minimal ChainlinkAnswerVerifier Test", function () {
  let verifier;
  let owner;
  
  before(function() {
    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  });
  
  beforeEach(async function () {
    try {
      [owner] = await ethers.getSigners();
      
      // Create a bytes32 DON ID
      const donId = ethers.utils.formatBytes32String("dev-donid");
      
      // Deploy ChainlinkAnswerVerifier contract with mock router address
      const ChainlinkAnswerVerifier = await ethers.getContractFactory("ChainlinkAnswerVerifier");
      verifier = await ChainlinkAnswerVerifier.deploy(owner.address, donId);
      await verifier.deployed();
      
      console.log("Contract deployed successfully");
    } catch (error) {
      console.error("Error in beforeEach:", error);
      throw error;
    }
  });

  it("should be able to deploy", async function () {
    try {
      // If we reach here, deployment was successful
      const ownerAddress = await verifier.owner();
      console.log("Contract owner:", ownerAddress);
    } catch (error) {
      console.error("Error in test:", error);
      throw error;
    }
  });
}); 