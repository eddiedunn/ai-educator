const { expect, assert } = require("chai");
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
    
    // Perform a manual mining step to ensure the state is updated
    await ethers.provider.send("evm_mine");
  });

  describe("Metadata", function () {
    it("should have correct name, symbol and decimals", async function () {
      const name = await puzzlePoints.name();
      const symbol = await puzzlePoints.symbol();
      const decimals = await puzzlePoints.decimals();
      
      assert.equal(name, "Puzzle Points");
      assert.equal(symbol, "PP");
      assert.equal(decimals, 18);
    });
  });

  describe("Token Minting", function () {
    it("should allow owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      
      // Mint tokens to user1
      const mintTx = await puzzlePoints.connect(owner).mint(user1.address, mintAmount);
      await mintTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check balance
      const balance = await puzzlePoints.balanceOf(user1.address);
      assert.equal(balance.toString(), mintAmount.toString());
    });
  });

  describe("Non-Transferability", function () {
    it("should not allow transfers between users", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      const transferAmount = ethers.utils.parseEther("50");
      
      // Mint tokens to user1
      const mintTx = await puzzlePoints.connect(owner).mint(user1.address, mintAmount);
      await mintTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // User1 tries to transfer tokens to user2 - should fail
      let transferFailed = false;
      try {
        await puzzlePoints.connect(user1).transfer(user2.address, transferAmount);
      } catch (error) {
        assert.include(error.message, "Points are non-transferable");
        transferFailed = true;
      }
      assert.isTrue(transferFailed, "Transfer should have failed");
      
      // Approve user2 to spend tokens
      const approveTx = await puzzlePoints.connect(user1).approve(user2.address, transferAmount);
      await approveTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // User2 tries to transferFrom user1 - should fail despite approval
      let transferFromFailed = false;
      try {
        await puzzlePoints.connect(user2).transferFrom(
          user1.address, 
          user2.address, 
          ethers.utils.parseEther("25")
        );
      } catch (error) {
        assert.include(error.message, "Points are non-transferable");
        transferFromFailed = true;
      }
      assert.isTrue(transferFromFailed, "TransferFrom should have failed");
    });
  });

  describe("Ownership", function () {
    it("should allow only owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("50");
      
      // Non-owner should not be able to mint
      let nonOwnerMintFailed = false;
      try {
        await puzzlePoints.connect(user1).mint(user2.address, mintAmount);
      } catch (error) {
        assert.include(error.message, "Ownable: caller is not the owner");
        nonOwnerMintFailed = true;
      }
      assert.isTrue(nonOwnerMintFailed, "Mint by non-owner should have failed");
      
      // Owner should be able to mint
      const mintTx = await puzzlePoints.connect(owner).mint(user2.address, mintAmount);
      await mintTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check balance
      const balance = await puzzlePoints.balanceOf(user2.address);
      assert.equal(balance.toString(), mintAmount.toString());
    });

    it("should allow ownership transfer", async function () {
      // Transfer ownership to user1
      const transferTx = await puzzlePoints.connect(owner).transferOwnership(user1.address);
      await transferTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Verify new owner
      const newOwner = await puzzlePoints.owner();
      assert.equal(newOwner, user1.address);
      
      // Original owner should no longer be able to mint
      let formerOwnerMintFailed = false;
      try {
        await puzzlePoints.connect(owner).mint(user2.address, ethers.utils.parseEther("100"));
      } catch (error) {
        assert.include(error.message, "Ownable: caller is not the owner");
        formerOwnerMintFailed = true;
      }
      assert.isTrue(formerOwnerMintFailed, "Mint by former owner should have failed");
      
      // New owner (user1) should be able to mint
      const mintAmount = ethers.utils.parseEther("100");
      const mintTx = await puzzlePoints.connect(user1).mint(user2.address, mintAmount);
      await mintTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check balance
      const balance = await puzzlePoints.balanceOf(user2.address);
      assert.equal(balance.toString(), mintAmount.toString());
    });
  });

  describe("Error Handling", function () {
    it("should revert when minting to zero address", async function () {
      // Try to mint to zero address - should fail
      let mintToZeroFailed = false;
      try {
        await puzzlePoints.connect(owner).mint(addr0, ethers.utils.parseEther("100"));
      } catch (error) {
        mintToZeroFailed = true;
      }
      assert.isTrue(mintToZeroFailed, "Mint to zero address should have failed");
    });

    it("should allow minting zero tokens", async function () {
      // Mint zero tokens - should succeed but have no effect
      const mintTx = await puzzlePoints.connect(owner).mint(user1.address, 0);
      await mintTx.wait();
      
      // Mine a block to ensure state updates
      await ethers.provider.send("evm_mine");
      
      // Check balance is zero
      const balance = await puzzlePoints.balanceOf(user1.address);
      assert.equal(balance.toString(), "0");
    });
  });
}); 