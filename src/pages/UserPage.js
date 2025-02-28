import React from 'react';
import { Button, Alert } from 'react-bootstrap';
import { ethers } from 'ethers';
import UserPanel from '../components/user/UserPanel';
import AvailableQuestionSets from '../components/user/AvailableQuestionSets';

const UserPage = ({ account, balance, tokenBalance, puzzlePoints, questionManager }) => {
  const handleCreateTestQuestionSet = async () => {
    try {
      if (!questionManager) {
        alert("Question Manager contract not connected!");
        return;
      }

      console.log("Checking QuestionManager contract:", questionManager.address);
      
      // Try to read owner
      try {
        const owner = await questionManager.owner();
        console.log("Contract owner:", owner);
        console.log("Current user:", account);
        
        if (owner.toLowerCase() !== account.toLowerCase()) {
          alert(`You are not the contract owner! You are: ${account}\nOwner is: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking owner:", error);
        alert(`Error checking contract owner: ${error.message}`);
      }
      
      // Try to read question sets
      try {
        console.log("Reading all question sets...");
        const questionSetIds = await questionManager.getQuestionSets();
        console.log("All question set IDs:", questionSetIds);
        
        const activeQuestionSets = await questionManager.getActiveQuestionSets();
        console.log("Active question set IDs:", activeQuestionSets);
      } catch (error) {
        console.error("Error reading question sets:", error);
        alert(`Error reading question sets: ${error.message}`);
      }
    } catch (error) {
      console.error("Error in diagnostic function:", error);
      alert(`Error in diagnostic function: ${error.message}`);
    }
  };

  // New function to verify contract connectivity after reset
  const verifyContractReset = async () => {
    try {
      console.log("=== CONTRACT RESET VERIFICATION ===");
      console.log("Your account:", account);
      
      if (!questionManager) {
        console.error("Question Manager not connected");
        alert("Question Manager contract not connected! Please check your MetaMask connection.");
        return;
      }
      
      console.log("Contract address:", questionManager.address);
      
      // Get current block number
      const provider = questionManager.provider;
      const blockNumber = await provider.getBlockNumber();
      console.log("Current block number:", blockNumber);
      
      // Get network info
      const network = await provider.getNetwork();
      console.log("Network:", network);
      
      // Try a simple call that doesn't modify state
      try {
        const signer = await questionManager.signer.getAddress();
        console.log("Signer address:", signer);
        console.log("Contract is accessible and connected properly!");
        alert("Contract connection verified successfully! Check console for details.");
      } catch (error) {
        console.error("Error accessing contract:", error);
        alert("Error accessing contract. Please check console for details.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert(`Verification error: ${error.message}`);
    }
  };

  return (
    <>
      <h1 className="my-4 text-center">User Interface</h1>
      
      <UserPanel account={account} balance={balance} tokenBalance={tokenBalance} puzzlePoints={puzzlePoints} />
      <AvailableQuestionSets questionManager={questionManager} />
    </>
  );
};

export default UserPage; 