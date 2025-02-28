const { expect } = require("chai");
const { ethers } = require("hardhat");

// No need to import ethereum-waffle/chai

describe("PuzzlePoints", function () {
  let PuzzlePoints;
  let puzzlePoints;
  let owner;
  let user1;
  let user2;
  let addr0 = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy PuzzlePoints contract
    PuzzlePoints = await ethers.getContractFactory("PuzzlePoints");
    puzzlePoints = await PuzzlePoints.deploy();
    await puzzlePoints.deployed();
  });

  describe("Metadata", function () {
    it("should have correct name, symbol and decimals", async function () {
      expect(await puzzlePoints.name()).to.equal("Puzzle Points");
      expect(await puzzlePoints.symbol()).to.equal("PP");
      expect(await puzzlePoints.decimals()).to.equal(18);
    });
  });

  describe("Token Minting", function () {
    it("should allow owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      
      // Mint tokens to user1
      await puzzlePoints.connect(owner).mint(user1.address, mintAmount);
      
      // Check balance
      expect(await puzzlePoints.balanceOf(user1.address)).to.equal(mintAmount);
      
      // Check total supply
      expect(await puzzlePoints.totalSupply()).to.equal(mintAmount);
    });
  });

  describe("Non-Transferability", function () {
    it("should not allow transfers between users", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      
      // Mint tokens to user1
      await puzzlePoints.connect(owner).mint(user1.address, mintAmount);
      
      // User1 tries to transfer tokens to user2 - should fail
      let failed = false;
      try {
        await puzzlePoints.connect(user1).transfer(user2.address, ethers.utils.parseEther("50"));
      } catch (error) {
        expect(error.message).to.include("Points are non-transferable");
        failed = true;
      }
      expect(failed).to.equal(true, "Transfer should have failed");
      
      // Approve user2 to spend tokens
      await puzzlePoints.connect(user1).approve(user2.address, ethers.utils.parseEther("50"));
      
      // Check allowance was set
      expect(await puzzlePoints.allowance(user1.address, user2.address))
        .to.equal(ethers.utils.parseEther("50"));
      
      // User2 tries to transferFrom user1 - should fail despite approval
      failed = false;
      try {
        await puzzlePoints.connect(user2).transferFrom(
          user1.address, 
          user2.address, 
          ethers.utils.parseEther("25")
        );
      } catch (error) {
        expect(error.message).to.include("Points are non-transferable");
        failed = true;
      }
      expect(failed).to.equal(true, "TransferFrom should have failed");
      
      // Balances should remain unchanged
      expect(await puzzlePoints.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await puzzlePoints.balanceOf(user2.address)).to.equal(0);
    });
  });

  describe("Ownership", function () {
    it("should allow only owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("50");
      
      // Non-owner should not be able to mint
      let failed = false;
      try {
        await puzzlePoints.connect(user1).mint(user2.address, mintAmount);
      } catch (error) {
        expect(error.message).to.include("Ownable: caller is not the owner");
        failed = true;
      }
      expect(failed).to.equal(true, "Mint by non-owner should have failed");
      
      // Owner should be able to mint
      await puzzlePoints.connect(owner).mint(user2.address, mintAmount);
      expect(await puzzlePoints.balanceOf(user2.address)).to.equal(mintAmount);
    });

    it("should allow ownership transfer", async function () {
      // Transfer ownership to user1
      await puzzlePoints.connect(owner).transferOwnership(user1.address);
      
      // Verify new owner
      expect(await puzzlePoints.owner()).to.equal(user1.address);
      
      // Original owner should no longer be able to mint
      let failed = false;
      try {
        await puzzlePoints.connect(owner).mint(user2.address, ethers.utils.parseEther("100"));
      } catch (error) {
        expect(error.message).to.include("Ownable: caller is not the owner");
        failed = true;
      }
      expect(failed).to.equal(true, "Mint by former owner should have failed");
      
      // New owner (user1) should be able to mint
      await puzzlePoints.connect(user1).mint(user2.address, ethers.utils.parseEther("100"));
      expect(await puzzlePoints.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Error Handling", function () {
    it("should revert when minting to zero address", async function () {
      // Try to mint to zero address - should fail
      let failed = false;
      try {
        await puzzlePoints.connect(owner).mint(addr0, ethers.utils.parseEther("100"));
      } catch (error) {
        failed = true;
      }
      expect(failed).to.equal(true, "Mint to zero address should have failed");
    });

    it("should allow minting zero tokens", async function () {
      // Mint zero tokens - should succeed but have no effect
      await puzzlePoints.connect(owner).mint(user1.address, 0);
      
      // Check balance is zero
      expect(await puzzlePoints.balanceOf(user1.address)).to.equal(0);
      
      // Check total supply is zero
      expect(await puzzlePoints.totalSupply()).to.equal(0);
    });
  });
}); 