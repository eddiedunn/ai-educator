const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("PuzzlePoints Enumerable", function () {
  let PuzzlePoints;
  let puzzlePoints;
  let owner;
  let user1, user2, user3, user4, user5;
  let addr0 = ethers.constants.AddressZero;
  
  beforeEach(async function () {
    [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
    
    // Deploy PuzzlePoints contract
    PuzzlePoints = await ethers.getContractFactory("PuzzlePoints");
    puzzlePoints = await PuzzlePoints.deploy();
    await puzzlePoints.deployed();
    
    // Perform a manual mining step to ensure the state is updated
    await ethers.provider.send("evm_mine", []);
  });

  describe("Holder Tracking", function () {
    it("should correctly track holders when tokens are minted", async function () {
      // Initially there should be no holders
      expect(await puzzlePoints.getHolderCount()).to.equal(0);
      
      // Mint tokens to user1
      await puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("100"));
      
      // There should be one holder now
      expect(await puzzlePoints.getHolderCount()).to.equal(1);
      expect(await puzzlePoints.isHolder(user1.address)).to.be.true;
      
      // Mint tokens to user2
      await puzzlePoints.connect(owner).mint(user2.address, ethers.utils.parseEther("200"));
      
      // There should be two holders now
      expect(await puzzlePoints.getHolderCount()).to.equal(2);
      expect(await puzzlePoints.isHolder(user2.address)).to.be.true;
      
      // Mint more tokens to user1 (existing holder)
      await puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("50"));
      
      // Holder count should still be 2
      expect(await puzzlePoints.getHolderCount()).to.equal(2);
    });
    
    it("should not add an address as holder when minting zero tokens", async function () {
      // Mint 0 tokens to user1
      await puzzlePoints.connect(owner).mint(user1.address, 0);
      
      // There should still be no holders
      expect(await puzzlePoints.getHolderCount()).to.equal(0);
      expect(await puzzlePoints.isHolder(user1.address)).to.be.false;
    });
    
    it("should emit HolderAdded event when a new holder is added", async function () {
      // Check for the HolderAdded event
      await expect(puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("100")))
        .to.emit(puzzlePoints, "HolderAdded")
        .withArgs(user1.address);
    });
    
    it("should not emit HolderAdded event for existing holders", async function () {
      // Add user1 as a holder first
      await puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("100"));
      
      // Mint more tokens to user1 - should not emit HolderAdded again
      const tx = await puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("50"));
      const receipt = await tx.wait();
      
      // Check that no HolderAdded event was emitted
      const events = receipt.events.filter(e => e.event === "HolderAdded");
      expect(events.length).to.equal(0);
    });
  });
  
  describe("Holder Pagination", function () {
    beforeEach(async function () {
      // Setup multiple holders with different balances
      await puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("100"));
      await puzzlePoints.connect(owner).mint(user2.address, ethers.utils.parseEther("200"));
      await puzzlePoints.connect(owner).mint(user3.address, ethers.utils.parseEther("300"));
      await puzzlePoints.connect(owner).mint(user4.address, ethers.utils.parseEther("400"));
      await puzzlePoints.connect(owner).mint(user5.address, ethers.utils.parseEther("500"));
    });
    
    it("should return the correct number of holders with pagination", async function () {
      // Get first 2 holders
      const [addresses1, balances1] = await puzzlePoints.getHolders(0, 2);
      expect(addresses1.length).to.equal(2);
      expect(balances1.length).to.equal(2);
      
      // Get next 2 holders
      const [addresses2, balances2] = await puzzlePoints.getHolders(2, 2);
      expect(addresses2.length).to.equal(2);
      expect(balances2.length).to.equal(2);
      
      // Get last holder
      const [addresses3, balances3] = await puzzlePoints.getHolders(4, 2);
      expect(addresses3.length).to.equal(1);
      expect(balances3.length).to.equal(1);
      
      // Check that we get different holders in each page
      expect(addresses1[0]).to.not.equal(addresses2[0]);
      expect(addresses1[1]).to.not.equal(addresses2[1]);
    });
    
    it("should return empty arrays for out-of-bounds pagination", async function () {
      // Get holders with offset beyond the total count
      const [addresses, balances] = await puzzlePoints.getHolders(10, 2);
      expect(addresses.length).to.equal(0);
      expect(balances.length).to.equal(0);
    });
    
    it("should properly handle limit beyond available holders", async function () {
      // Ask for 10 holders when only 5 exist
      const [addresses, balances] = await puzzlePoints.getHolders(0, 10);
      expect(addresses.length).to.equal(5);
      expect(balances.length).to.equal(5);
    });
  });
  
  describe("Top Holders", function () {
    beforeEach(async function () {
      // Setup multiple holders with different balances in non-sorted order
      await puzzlePoints.connect(owner).mint(user1.address, ethers.utils.parseEther("300"));
      await puzzlePoints.connect(owner).mint(user2.address, ethers.utils.parseEther("100"));
      await puzzlePoints.connect(owner).mint(user3.address, ethers.utils.parseEther("500"));
      await puzzlePoints.connect(owner).mint(user4.address, ethers.utils.parseEther("200"));
      await puzzlePoints.connect(owner).mint(user5.address, ethers.utils.parseEther("400"));
    });
    
    it("should return holders sorted by balance in descending order", async function () {
      // Get top 3 holders
      const [addresses, balances] = await puzzlePoints.getTopHolders(3);
      
      // Check that we got 3 holders
      expect(addresses.length).to.equal(3);
      expect(balances.length).to.equal(3);
      
      // Check that they are sorted by balance (descending)
      expect(balances[0]).to.be.gt(balances[1]);
      expect(balances[1]).to.be.gt(balances[2]);
      
      // Verify the top holder is user3 with 500 tokens
      expect(addresses[0]).to.equal(user3.address);
      expect(ethers.utils.formatEther(balances[0])).to.equal("500.0");
      
      // Verify the second holder is user5 with 400 tokens
      expect(addresses[1]).to.equal(user5.address);
      expect(ethers.utils.formatEther(balances[1])).to.equal("400.0");
      
      // Verify the third holder is user1 with 300 tokens
      expect(addresses[2]).to.equal(user1.address);
      expect(ethers.utils.formatEther(balances[2])).to.equal("300.0");
    });
    
    it("should cap the result to the actual number of holders", async function () {
      // Ask for 10 holders when only 5 exist
      const [addresses, balances] = await puzzlePoints.getTopHolders(10);
      expect(addresses.length).to.equal(5);
      expect(balances.length).to.equal(5);
    });
    
    it("should return empty arrays when asking for 0 holders", async function () {
      // Ask for 0 holders
      const [addresses, balances] = await puzzlePoints.getTopHolders(0);
      expect(addresses.length).to.equal(0);
      expect(balances.length).to.equal(0);
    });
  });
  
  describe("Edge Cases", function () {
    it("should revert when attempting to add zero address as holder", async function () {
      // This should never happen in normal operation, but we'll test it by 
      // creating a mock contract that tries to call _addHolder with zero address
      
      // For simplicity, we'll just test that mint with zero address reverts
      await expect(puzzlePoints.connect(owner).mint(addr0, ethers.utils.parseEther("100")))
        .to.be.revertedWith("ERC20: mint to the zero address");
    });
  });
}); 