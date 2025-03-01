import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Accordion, Table, Badge, Form, ListGroup } from 'react-bootstrap';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config';
import { submitWithGasEstimate } from '../utils/contractTestUtils';
import { getAddressExplorerUrl, getNetworkName, EXPLORER_URLS, getTxExplorerUrl } from '../utils/explorerUrls';

const DebugPage = ({ account, puzzlePoints, questionManager }) => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractInfo, setContractInfo] = useState({});
  const [totalSupply, setTotalSupply] = useState('0');
  const [holderCount, setHolderCount] = useState(0);
  const [error, setError] = useState(null);
  const [testAddress, setTestAddress] = useState('');
  const [testAddressBalance, setTestAddressBalance] = useState(null);
  const [mintAmount, setMintAmount] = useState('10');
  const [mintAddress, setMintAddress] = useState('');
  const [mintStatus, setMintStatus] = useState(null);
  
  // Submission Test state
  const [submissionTestStatus, setSubmissionTestStatus] = useState(null);
  
  // Chainlink diagnostics state
  const [testQuestionSetId, setTestQuestionSetId] = useState('');
  const [testAnswersHash, setTestAnswersHash] = useState('0x0000000000000000000000000000000000000000000000000000000000000000');
  const [diagnosticsResults, setDiagnosticsResults] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState(null);

  // Add this new state for the question set verification
  const [verifyQuestionSetId, setVerifyQuestionSetId] = useState('');
  const [questionSetVerificationResult, setQuestionSetVerificationResult] = useState(null);

  // Add this new state for localStorage question sets
  const [localStorageQuestionSets, setLocalStorageQuestionSets] = useState(null);

  // Add these new states for manual question set submission
  const [manualSubmitStatus, setManualSubmitStatus] = useState(null);

  // Add these new states for manual answer submission
  const [manualAnswerSubmitStatus, setManualAnswerSubmitStatus] = useState(null);
  const [manualAnswerQuestionSetId, setManualAnswerQuestionSetId] = useState('univ2');
  const [manualAnswerHash, setManualAnswerHash] = useState('0x1111111111111111111111111111111111111111111111111111111111111111');
  const [manualGasLimit, setManualGasLimit] = useState('500000');

  // Add state for the static call diagnostic tool
  const [staticCallQuestionSetId, setStaticCallQuestionSetId] = useState('univ2');
  const [staticCallAnswerHash, setStaticCallAnswerHash] = useState('0x1111111111111111111111111111111111111111111111111111111111111111');
  const [staticCallResult, setStaticCallResult] = useState(null);
  const [isStaticCallLoading, setIsStaticCallLoading] = useState(false);

  // Add state for JSON blob inspector
  const [jsonBlobInspector, setJsonBlobInspector] = useState({
    blobType: 'answers',
    jsonContent: '',
    validationResult: null,
    simulationResult: null,
    isLoading: false
  });

  // Add state for Chainlink Config checker
  const [chainlinkConfigStatus, setChainlinkConfigStatus] = useState(null);

  // Add state for LLM Answer Format Inspector
  const [llmFormatStatus, setLlmFormatStatus] = useState(null);

  // Add new state variables for Chainlink Functions Test
  const [chainlinkFunctionTest, setChainlinkFunctionTest] = useState({
    isLoading: false,
    status: null,
    message: "",
    subscriptionStatus: null,
    donStatus: null,
    secretsStatus: null,
    testEvaluation: null
  });

  // Add new state variables for Call Trace Simulator
  const [callTraceSimulator, setCallTraceSimulator] = useState({
    isLoading: false,
    questionSetId: "univ2",
    answerHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    result: null,
    error: null
  });

  // Add new state variables for Contract Interface Explorer
  const [contractInterface, setContractInterface] = useState({
    isLoading: false,
    selectedContract: "questionManager",
    functions: null,
    error: null
  });

  // Load network info
  useEffect(() => {
    const getNetworkInfo = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        setNetworkInfo({
          name: network.name,
          chainId: parseInt(chainId, 16),
          ensAddress: network.ensAddress || 'None'
        });
      } catch (error) {
        console.error('Error fetching network info:', error);
        setError('Failed to fetch network information');
      }
    };
    
    getNetworkInfo();
  }, []);

  // Load contract information
  useEffect(() => {
    const fetchContractInfo = async () => {
      if (!puzzlePoints || !questionManager) return;
      
      try {
        // Get PZL token total supply
        const supply = await puzzlePoints.totalSupply();
        setTotalSupply(ethers.utils.formatUnits(supply, 18));
        
        // Get holder count if supported
        try {
          const holders = await puzzlePoints.getHolderCount();
          setHolderCount(holders.toNumber());
        } catch (err) {
          console.log('Holder count not available:', err.message);
          setHolderCount(null);
        }
        
        // Get contract details
        setContractInfo({
          puzzlePointsAddress: puzzlePoints.address,
          questionManagerAddress: questionManager.address,
          puzzlePointsName: await puzzlePoints.name(),
          puzzlePointsSymbol: await puzzlePoints.symbol(),
          puzzlePointsDecimals: (await puzzlePoints.decimals()).toString(),
          questionManagerOwner: await questionManager.owner()
        });
      } catch (error) {
        console.error('Error fetching contract info:', error);
        setError('Failed to fetch contract information');
      }
    };
    
    fetchContractInfo();
  }, [puzzlePoints, questionManager]);

  // Check balance of a specific address
  const checkBalance = async () => {
    if (!puzzlePoints || !testAddress) return;
    
    try {
      // Validate address
      const formattedAddress = ethers.utils.getAddress(testAddress);
      
      // Get token balance
      const balance = await puzzlePoints.balanceOf(formattedAddress);
      const formattedBalance = ethers.utils.formatUnits(balance, 18);
      
      // Check if address is a holder (if enumerable)
      let isHolder = false;
      try {
        isHolder = await puzzlePoints.isHolder(formattedAddress);
      } catch (err) {
        console.log('isHolder not available:', err.message);
      }
      
      setTestAddressBalance({
        address: formattedAddress,
        balance: formattedBalance,
        isHolder
      });
      
    } catch (error) {
      console.error('Error checking balance:', error);
      setTestAddressBalance({
        error: 'Invalid address or error fetching balance'
      });
    }
  };

  // Mint tokens to an address (admin only)
  const mintTokens = async () => {
    if (!puzzlePoints || !mintAddress) return;
    
    try {
      setMintStatus({ type: 'info', message: 'Processing mint transaction...' });
      
      // Validate address
      const formattedAddress = ethers.utils.getAddress(mintAddress);
      
      // Convert amount to wei
      const amount = ethers.utils.parseUnits(mintAmount, 18);
      
      // Send mint transaction
      const tx = await puzzlePoints.mint(formattedAddress, amount);
      
      setMintStatus({ type: 'info', message: 'Transaction sent. Waiting for confirmation...' });
      
      // Wait for confirmation
      await tx.wait();
      
      setMintStatus({ 
        type: 'success', 
        message: `Successfully minted ${mintAmount} PZL to ${formattedAddress}`,
        address: formattedAddress // Store the address for rendering with explorer link
      });
      
    } catch (error) {
      console.error('Error minting tokens:', error);
      setMintStatus({ 
        type: 'danger', 
        message: `Mint failed: ${error.message || 'Unknown error'}` 
      });
    }
  };

  // Submission Test functions
  const testMinimalSubmission = async () => {
    setSubmissionTestStatus({ type: 'info', message: 'Running minimal submission test...' });
    try {
      // Create minimal test data
      const minimalTestData = {
        questionSetId: 'test-minimal',
        answersHash: '0x0000000000000000000000000000000000000000000000000000000000000001'
      };
      
      // Attempt submission
      const tx = await questionManager.submitAssessmentAnswers(
        minimalTestData.questionSetId,
        minimalTestData.answersHash
      );
      
      await tx.wait();
      setSubmissionTestStatus({ 
        type: 'success', 
        message: 'Minimal submission test successful! Transaction was accepted.'
      });
    } catch (error) {
      console.error('Minimal submission test failed:', error);
      setSubmissionTestStatus({ 
        type: 'danger', 
        message: `Test failed: ${error.message || 'Unknown error'}`
      });
    }
  };
  
  const circuitBreakerTest = async () => {
    setSubmissionTestStatus({ type: 'info', message: 'Running circuit breaker test...' });
    try {
      // Check if circuit breaker is active
      const isPaused = await questionManager.paused();
      
      if (isPaused) {
        setSubmissionTestStatus({ 
          type: 'warning', 
          message: 'Circuit breaker is ACTIVE. Contract is paused!'
        });
      } else {
        // Test pausing and unpausing
        const pauseTx = await questionManager.pause();
        await pauseTx.wait();
        
        const unpauseTx = await questionManager.unpause();
        await unpauseTx.wait();
        
        setSubmissionTestStatus({ 
          type: 'success', 
          message: 'Circuit breaker test successful. Contract pause/unpause working correctly.'
        });
      }
    } catch (error) {
      console.error('Circuit breaker test failed:', error);
      setSubmissionTestStatus({ 
        type: 'danger', 
        message: `Test failed: ${error.message || 'Unknown error'}`
      });
    }
  };
  
  const checkAdminAccount = async () => {
    setSubmissionTestStatus({ type: 'info', message: 'Checking admin status...' });
    try {
      // Check if connected account is owner/admin
      const owner = await questionManager.owner();
      const isOwner = owner.toLowerCase() === account.toLowerCase();
      
      // Check for admin role if applicable
      let hasAdminRole = false;
      try {
        hasAdminRole = await questionManager.hasRole('0x0000000000000000000000000000000000000000000000000000000000000000', account);
      } catch (err) {
        // Contract might not use role-based access control
        console.log('Role check not available');
      }
      
      if (isOwner || hasAdminRole) {
        setSubmissionTestStatus({ 
          type: 'success', 
          message: `Account ${isOwner ? 'is the contract owner' : 'has admin role'}. Admin privileges confirmed.`
        });
      } else {
        setSubmissionTestStatus({ 
          type: 'warning', 
          message: `Account ${account} is NOT an admin on the contract. Owner is ${owner}`
        });
      }
    } catch (error) {
      console.error('Admin check failed:', error);
      setSubmissionTestStatus({ 
        type: 'danger', 
        message: `Check failed: ${error.message || 'Unknown error'}`
      });
    }
  };
  
  const runDeepDiagnostics = async () => {
    setSubmissionTestStatus({ type: 'info', message: 'Running deep diagnostics...' });
    try {
      // Series of checks
      const checks = [];
      
      // 1. Contract connectivity
      checks.push({ name: 'Contract Connection', status: !!questionManager });
      
      // 2. Check owner
      const owner = await questionManager.owner();
      checks.push({ name: 'Owner Configured', status: owner !== ethers.constants.AddressZero });
      
      // 3. Check for any linked verifier contract
      let verifierAddress;
      try {
        verifierAddress = await questionManager.verifier();
        checks.push({ name: 'Verifier Connection', status: verifierAddress !== ethers.constants.AddressZero });
      } catch (err) {
        checks.push({ name: 'Verifier Connection', status: false, error: err.message });
      }
      
      // 4. Check gas limits
      let gasLimitOk = false;
      try {
        const gasLimit = await questionManager.estimateGas.submitAssessmentAnswers('test', '0x00');
        gasLimitOk = gasLimit.lt(ethers.utils.parseUnits('1', 'ether')); // Reasonable limit
        checks.push({ name: 'Gas Limit', status: gasLimitOk });
      } catch (err) {
        checks.push({ name: 'Gas Limit', status: false, error: err.message });
      }
      
      // Calculate overall health
      const passedChecks = checks.filter(c => c.status).length;
      const healthPercentage = Math.round((passedChecks / checks.length) * 100);
      
      setSubmissionTestStatus({ 
        type: healthPercentage > 75 ? 'success' : healthPercentage > 50 ? 'warning' : 'danger',
        message: `Deep diagnostics complete. System health: ${healthPercentage}%`,
        details: checks
      });
    } catch (error) {
      console.error('Deep diagnostics failed:', error);
      setSubmissionTestStatus({ 
        type: 'danger', 
        message: `Diagnostics failed: ${error.message || 'Unknown error'}`
      });
    }
  };

  // Run Chainlink diagnostics
  const runChainlinkDiagnostics = async () => {
    if (!questionManager || !testQuestionSetId) {
      setDiagnosticsError("Please enter a Question Set ID");
      return;
    }
    
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    
    try {
      console.log("Running Chainlink assessment diagnostics...");
      console.log(`Question Set ID: ${testQuestionSetId}`);
      console.log(`Answers Hash: ${testAnswersHash}`);
      
      // Run gas estimation test using the utility function
      const result = await submitWithGasEstimate(questionManager, testQuestionSetId, testAnswersHash);
      setDiagnosticsResults(result);
      
    } catch (err) {
      console.error("Error running diagnostics:", err);
      setDiagnosticsError(err.message || "An unexpected error occurred");
      setDiagnosticsResults({
        success: false,
        error: "Diagnostic tool error",
        details: err.message
      });
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  // Fix the question set verification function
  const verifyQuestionSetExists = async () => {
    if (!questionManager || !verifyQuestionSetId) {
      setQuestionSetVerificationResult({
        status: 'error',
        message: 'Please enter a Question Set ID and ensure QuestionManager is connected.'
      });
      return;
    }

    try {
      setQuestionSetVerificationResult({ status: 'loading', message: 'Checking...' });

      // Try different methods to check if the question set exists
      try {
        // Let's try to call a function that might exist to check if the question set exists
        // First, let's log the available functions on the contract for debugging
        console.log("Available methods on questionManager:", Object.keys(questionManager));
        
        // Try calling questionExists (common function name)
        let exists = false;
        try {
          exists = await questionManager.questionSetExists(verifyQuestionSetId);
        } catch (e) {
          console.log("questionSetExists not available:", e.message);
          // Try another common function name
          try {
            exists = await questionManager.hasQuestionSet(verifyQuestionSetId);
          } catch (e2) {
            console.log("hasQuestionSet not available:", e2.message);
          }
        }

        if (exists) {
          // If we confirmed it exists, try to get more details
          let hash = "Unknown";
          let count = "Unknown";
          let timestamp = "Unknown";
          
          // Try different methods for getting the hash
          try {
            hash = await questionManager.questionSetHashes(verifyQuestionSetId);
          } catch (e) {
            try {
              hash = await questionManager.getHash(verifyQuestionSetId);
            } catch (e2) {
              console.log("Could not get hash:", e2.message);
            }
          }
          
          // Try different methods for getting the question count
          try {
            count = await questionManager.questionCounts(verifyQuestionSetId);
            count = count.toString();
          } catch (e) {
            try {
              count = await questionManager.getCount(verifyQuestionSetId);
              count = count.toString();
            } catch (e2) {
              console.log("Could not get count:", e2.message);
            }
          }
          
          // Try different methods for getting the timestamp
          try {
            timestamp = await questionManager.questionSetTimestamps(verifyQuestionSetId);
            timestamp = new Date(timestamp.toNumber() * 1000).toLocaleString();
          } catch (e) {
            try {
              timestamp = await questionManager.getTimestamp(verifyQuestionSetId);
              timestamp = new Date(timestamp.toNumber() * 1000).toLocaleString();
            } catch (e2) {
              console.log("Could not get timestamp:", e2.message);
            }
          }
          
          setQuestionSetVerificationResult({
            status: 'success',
            message: `Question set "${verifyQuestionSetId}" exists!`,
            details: {
              hash: hash.toString(),
              count: count,
              timestamp: timestamp
            }
          });
        } else {
          // We couldn't confirm it exists with direct methods, try an indirect approach
          // Many contracts will revert if you try to access non-existent data
          let indirectCheck = false;
          
          try {
            // Call a method that would read data for this question set
            // This is a fallback approach if direct existence checks aren't available
            await questionManager.questionSetHashes(verifyQuestionSetId);
            indirectCheck = true;
          } catch (error) {
            if (error.message.includes("revert")) {
              indirectCheck = false;
            } else {
              // If it's not a revert error, the question set might exist
              indirectCheck = true;
            }
          }
          
          if (indirectCheck) {
            setQuestionSetVerificationResult({
              status: 'success',
              message: `Question set "${verifyQuestionSetId}" appears to exist, but full details couldn't be retrieved.`,
              details: {
                note: "Contract methods for retrieving details are different than expected."
              }
            });
          } else {
            setQuestionSetVerificationResult({
              status: 'error',
              message: `Question set "${verifyQuestionSetId}" does NOT exist or is not accessible.`
            });
          }
        }
      } catch (error) {
        // If all our attempts failed, report the error
        console.error("All verification methods failed:", error);
        setQuestionSetVerificationResult({
          status: 'error',
          message: `Question set verification failed. Contract interface may be different than expected.`,
          details: {
            error: error.message
          }
        });
      }
    } catch (error) {
      console.error("Error verifying question set:", error);
      setQuestionSetVerificationResult({
        status: 'error',
        message: `Error checking question set: ${error.message}`,
      });
    }
  };

  // Add this function to check localStorage question sets
  const checkLocalStorageQuestionSets = () => {
    try {
      const localQuestionSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
      setLocalStorageQuestionSets(localQuestionSets);
    } catch (error) {
      console.error("Error parsing localStorage question sets:", error);
      setLocalStorageQuestionSets({ error: error.message });
    }
  };

  // Add this function to manually submit a question set
  const submitSelectedQuestionSet = async (set) => {
    if (!questionManager || !set) {
      setManualSubmitStatus({
        status: 'error',
        message: 'Question Manager not connected or no question set selected.'
      });
      return;
    }

    try {
      setManualSubmitStatus({
        status: 'loading',
        message: `Submitting question set "${set.id}" to the contract...`
      });
      
      // Estimate gas for the transaction
      let estimatedGas;
      try {
        estimatedGas = await questionManager.estimateGas.submitQuestionSetHash(
          set.id,
          set.contentHash,
          set.questionCount
        );
        console.log("Estimated gas:", estimatedGas.toString());
      } catch (gasError) {
        console.error("Gas estimation failed:", gasError);
        setManualSubmitStatus({
          status: 'error',
          message: `Gas estimation failed. The transaction would likely revert with error: ${gasError.message}`
        });
        return;
      }
      
      // Send the transaction with extra gas buffer
      const tx = await questionManager.submitQuestionSetHash(
        set.id,
        set.contentHash,
        set.questionCount,
        {
          gasLimit: estimatedGas.mul(12).div(10) // Add 20% buffer
        }
      );
      
      setManualSubmitStatus({
        status: 'pending',
        message: `Transaction submitted! Waiting for confirmation...`,
        txHash: tx.hash
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setManualSubmitStatus({
        status: 'success',
        message: `Question set "${set.id}" successfully submitted to the contract!`,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
    } catch (error) {
      console.error("Error submitting question set:", error);
      setManualSubmitStatus({
        status: 'error',
        message: `Error submitting question set: ${error.message}`
      });
    }
  };

  // Add this function to manually submit answers with a fixed gas limit
  const submitAnswersWithFixedGas = async () => {
    if (!questionManager) {
      setManualAnswerSubmitStatus({
        status: 'error',
        message: 'Question Manager not connected.'
      });
      return;
    }

    try {
      setManualAnswerSubmitStatus({
        status: 'loading',
        message: `Preparing to submit answers for "${manualAnswerQuestionSetId}" with fixed gas limit...`
      });
      
      // Create a transaction object with a fixed gas limit
      const tx = await questionManager.submitAssessmentAnswers(
        manualAnswerQuestionSetId,
        manualAnswerHash,
        {
          gasLimit: ethers.utils.parseUnits(manualGasLimit, 'wei') // Use the manual gas limit
        }
      );
      
      setManualAnswerSubmitStatus({
        status: 'pending',
        message: `Transaction submitted! Waiting for confirmation...`,
        txHash: tx.hash
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setManualAnswerSubmitStatus({
        status: 'success',
        message: `Answers successfully submitted for "${manualAnswerQuestionSetId}"!`,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
    } catch (error) {
      console.error("Error submitting answers:", error);
      
      // Try to extract more detailed error information
      let errorMessage = error.message;
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
      
      setManualAnswerSubmitStatus({
        status: 'error',
        message: `Error submitting answers: ${errorMessage}`,
        details: JSON.stringify(error, (key, value) => 
          key === 'message' || key === 'code' || key === 'details' ? value : undefined, 2)
      });
    }
  };

  // Add this function to diagnose revert reasons using a static call
  const diagnoseTxRevertReason = async () => {
    if (!questionManager) {
      setStaticCallResult({
        status: 'error',
        message: 'Question Manager not connected.'
      });
      return;
    }

    try {
      setIsStaticCallLoading(true);
      setStaticCallResult({
        status: 'loading',
        message: 'Simulating transaction to identify revert reason...'
      });
      
      // Get the provider
      const provider = questionManager.provider;
      
      // Create the transaction data
      const data = questionManager.interface.encodeFunctionData('submitAssessmentAnswers', [
        staticCallQuestionSetId,
        staticCallAnswerHash
      ]);
      
      // Create a transaction object
      const tx = {
        from: account,
        to: questionManager.address,
        data: data
      };
      
      try {
        // Try to simulate the transaction using a static call
        await provider.call(tx);
        
        // If we get here, the transaction would succeed
        setStaticCallResult({
          status: 'success',
          message: 'Transaction would succeed!'
        });
      } catch (error) {
        // This is where we capture the revert reason
        console.error("Static call error:", error);
        
        let revertReason = "Unknown reason";
        let rawError = error.message;
        
        // Try to extract the revert reason
        if (error.data) {
          // Try to decode the error data if available
          try {
            const errorData = error.data;
            
            // Try to decode using the error ABI from the contract
            try {
              // This assumes the contract has error definitions that ethers can decode
              const decodedError = questionManager.interface.parseError(errorData);
              if (decodedError) {
                revertReason = `${decodedError.name}(${decodedError.args.join(', ')})`;
              }
            } catch (decodeErr) {
              console.log("Could not decode error:", decodeErr);
            }
            
            // If we still don't have a reason, try to extract it from the raw data
            if (revertReason === "Unknown reason" && typeof errorData === 'string') {
              // Look for the revert string in the error data
              const hexRevertReason = errorData.slice(138);
              if (hexRevertReason && hexRevertReason.length > 0) {
                // Convert from hex to string
                try {
                  revertReason = ethers.utils.toUtf8String('0x' + hexRevertReason);
                } catch (e) {
                  console.log("Could not parse revert string:", e);
                }
              }
            }
          } catch (extractErr) {
            console.log("Error extracting revert reason:", extractErr);
          }
        } else if (error.message) {
          // Try to extract the reason from the error message
          const revertStringMatch = error.message.match(/reverted with reason string '(.*)'/);
          if (revertStringMatch && revertStringMatch[1]) {
            revertReason = revertStringMatch[1];
          } else if (error.message.includes('execution reverted:')) {
            revertReason = error.message.split('execution reverted:')[1].trim();
          }
        }
        
        // Set the result with the revert reason
        setStaticCallResult({
          status: 'error',
          message: `Transaction would fail with reason: ${revertReason}`,
          details: {
            reason: revertReason,
            rawError: rawError
          }
        });
      }
    } catch (error) {
      console.error("Overall diagnostic error:", error);
      setStaticCallResult({
        status: 'error',
        message: `Error running diagnostic: ${error.message}`
      });
    } finally {
      setIsStaticCallLoading(false);
    }
  };

  // Helper function to render status badge
  const renderStatusBadge = (success) => {
    return success ? 
      <Badge bg="success">Pass</Badge> : 
      <Badge bg="danger">Fail</Badge>;
  };
  
  // Helper function to determine alert variant based on results
  const getAlertVariant = (results) => {
    if (!results) return "primary";
    return results.success ? "success" : "danger";
  };

  // Helper function to render address with explorer link
  const renderAddressWithExplorer = (address, chainId) => {
    const explorerUrl = getAddressExplorerUrl(address, chainId);
    
    return (
      <>
        <small className="text-break">{address}</small>
        {explorerUrl && (
          <div className="mt-1">
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-sm btn-outline-primary"
            >
              View on {getNetworkName(chainId)} Explorer
            </a>
          </div>
        )}
      </>
    );
  };

  // Add this function to validate and simulate JSON blobs
  const validateJsonBlob = async () => {
    try {
      setJsonBlobInspector(prev => ({ ...prev, isLoading: true, validationResult: null, simulationResult: null }));
      
      // First, validate the JSON format
      let jsonObj;
      try {
        jsonObj = JSON.parse(jsonBlobInspector.jsonContent);
        
        // Basic structure validation based on blob type
        let structureValid = false;
        let structureMessage = "Invalid structure for this blob type.";
        
        if (jsonBlobInspector.blobType === 'answers') {
          // Validate answers structure
          structureValid = jsonObj.answers && Array.isArray(jsonObj.answers);
          structureMessage = structureValid 
            ? "✅ Valid answers structure with " + jsonObj.answers.length + " answers."
            : "❌ Invalid answers structure. Expected {answers: [...]} format.";
        } else if (jsonBlobInspector.blobType === 'questions') {
          // Validate questions structure
          structureValid = jsonObj.questions && Array.isArray(jsonObj.questions);
          structureMessage = structureValid 
            ? "✅ Valid questions structure with " + jsonObj.questions.length + " questions."
            : "❌ Invalid questions structure. Expected {questions: [...]} format.";
        }
        
        // Hash the content for blockchain submission
        const contentString = JSON.stringify(jsonObj);
        const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(contentString));
        
        setJsonBlobInspector(prev => ({
          ...prev,
          isLoading: false,
          validationResult: {
            valid: true,
            message: "JSON is valid. " + structureMessage,
            contentHash: contentHash,
            structureValid
          }
        }));
        
        // Simulate submission with this hash
        if (structureValid) {
          simulateSubmission(contentHash);
        }
        
      } catch (parseErr) {
        setJsonBlobInspector(prev => ({
          ...prev,
          isLoading: false,
          validationResult: {
            valid: false,
            message: "Invalid JSON: " + parseErr.message
          }
        }));
      }
    } catch (error) {
      console.error("Error in validation:", error);
      setJsonBlobInspector(prev => ({
        ...prev,
        isLoading: false,
        validationResult: {
          valid: false,
          message: "Error during validation: " + error.message
        }
      }));
    }
  };

  // Add this function to simulate a submission
  const simulateSubmission = async (contentHash) => {
    try {
      setJsonBlobInspector(prev => ({ ...prev, isLoading: true }));
      
      // Check the type of simulation
      if (jsonBlobInspector.blobType === 'answers') {
        // Simulate answer submission
        try {
          // First check if question set exists
          const questionSetResult = await questionManager.callStatic.getQuestionSetMetadata("univ2");
          
          if (questionSetResult && ethers.utils.hexlify(questionSetResult.contentHash) !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Then try to simulate the answer submission
            try {
              await questionManager.callStatic.submitAssessmentAnswers("univ2", contentHash);
              
              setJsonBlobInspector(prev => ({
                ...prev,
                isLoading: false,
                simulationResult: {
                  success: true,
                  message: "Simulation successful: transaction would succeed."
                }
              }));
            } catch (submitError) {
              // Extract the reason from the error
              let reason = "Unknown reason";
              if (submitError.message) {
                const matches = submitError.message.match(/reason="([^"]+)"/);
                reason = matches && matches[1] ? matches[1] : submitError.message;
              }
              
              setJsonBlobInspector(prev => ({
                ...prev,
                isLoading: false,
                simulationResult: {
                  success: false,
                  message: "Simulation failed: transaction would revert.",
                  error: reason
                }
              }));
            }
          } else {
            setJsonBlobInspector(prev => ({
              ...prev,
              isLoading: false,
              simulationResult: {
                success: false,
                message: "Question set 'univ2' does not exist on the contract."
              }
            }));
          }
        } catch (error) {
          setJsonBlobInspector(prev => ({
            ...prev,
            isLoading: false,
            simulationResult: {
              success: false,
              message: "Error in simulation: " + error.message
            }
          }));
        }
      } else if (jsonBlobInspector.blobType === 'questions') {
        // Simulate question set submission
        try {
          // Try to simulate the question set submission
          // Extract question count from the JSON
          const jsonObj = JSON.parse(jsonBlobInspector.jsonContent);
          const questionCount = jsonObj.questions ? jsonObj.questions.length : 0;
          
          try {
            await questionManager.callStatic.submitQuestionSetHash("univ2", contentHash, questionCount);
            
            setJsonBlobInspector(prev => ({
              ...prev,
              isLoading: false,
              simulationResult: {
                success: true,
                message: "Simulation successful: question set would be accepted."
              }
            }));
          } catch (submitError) {
            // Extract the reason
            let reason = "Unknown reason";
            if (submitError.message) {
              const matches = submitError.message.match(/reason="([^"]+)"/);
              reason = matches && matches[1] ? matches[1] : submitError.message;
            }
            
            setJsonBlobInspector(prev => ({
              ...prev,
              isLoading: false,
              simulationResult: {
                success: false,
                message: "Simulation failed: question set submission would revert.",
                error: reason
              }
            }));
          }
        } catch (error) {
          setJsonBlobInspector(prev => ({
            ...prev,
            isLoading: false,
            simulationResult: {
              success: false,
              message: "Error in simulation: " + error.message
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error in simulation:", error);
      setJsonBlobInspector(prev => ({
        ...prev,
        isLoading: false,
        simulationResult: {
          success: false,
          message: "Error during simulation: " + error.message
        }
      }));
    }
  };

  // Add this function to check Chainlink configuration
  const checkChainlinkConfiguration = async () => {
    try {
      setChainlinkConfigStatus({ isLoading: true, message: "Checking configuration..." });
      
      // First check if answerVerifier is set
      const verifierAddress = await questionManager.answerVerifier();
      
      if (verifierAddress === ethers.constants.AddressZero) {
        setChainlinkConfigStatus({
          isLoading: false,
          status: "error",
          message: "Answer verifier is not set in QuestionManager."
        });
        return;
      }
      
      // Create a verifier contract instance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const verifierContract = new ethers.Contract(
        verifierAddress,
        [
          "function authorizedCallers(address) view returns (bool)",
          "function evaluationSource() view returns (string)",
          "function subscriptionId() view returns (uint64)",
          "function donID() view returns (bytes32)"
        ],
        provider
      );
      
      // Check if QuestionManager is authorized
      const isAuthorized = await verifierContract.authorizedCallers(questionManager.address);
      
      // Check if evaluation source is set
      let evaluationSource = "";
      try {
        evaluationSource = await verifierContract.evaluationSource();
      } catch (e) {
        console.error("Error getting evaluation source:", e);
      }
      
      // Check if subscription ID is set
      let subId = 0;
      try {
        subId = await verifierContract.subscriptionId();
      } catch (e) {
        console.error("Error getting subscription ID:", e);
      }
      
      // Check if DON ID is set
      let donId = ethers.constants.HashZero;
      try {
        donId = await verifierContract.donID();
      } catch (e) {
        console.error("Error getting DON ID:", e);
      }
      
      // Prepare the results
      const results = {
        verifierAddress,
        isAuthorized,
        evaluationSourceSet: evaluationSource && evaluationSource.length > 0,
        subscriptionIdSet: subId > 0,
        donIdSet: donId !== ethers.constants.HashZero,
        details: {
          evaluationSourceLength: evaluationSource ? evaluationSource.length : 0,
          subscriptionId: subId.toString(),
          donId: donId
        }
      };
      
      // Determine overall status
      const configComplete = isAuthorized && 
                          results.evaluationSourceSet && 
                          results.subscriptionIdSet && 
                          results.donIdSet;
      
      setChainlinkConfigStatus({
        isLoading: false,
        status: configComplete ? "success" : "warning",
        message: configComplete 
          ? "Chainlink configuration is complete!" 
          : "Chainlink configuration is incomplete.",
        results
      });
      
    } catch (error) {
      console.error("Error checking Chainlink configuration:", error);
      setChainlinkConfigStatus({
        isLoading: false,
        status: "error",
        message: "Error checking configuration: " + error.message
      });
    }
  };

  // Add this function to analyze Chainlink JavaScript format
  const checkChainlinkJsFormat = async () => {
    try {
      setLlmFormatStatus({ isLoading: true, message: "Analyzing source code..." });
      
      // First get the verifier address from the question manager
      const verifierAddress = await questionManager.answerVerifier();
      
      if (verifierAddress === ethers.constants.AddressZero) {
        setLlmFormatStatus({
          status: "warning",
          title: "Verifier Not Set",
          message: "The answer verifier address is not set in the QuestionManager.",
          recommendations: [
            {
              title: "Set Verifier Contract",
              description: "You need to set the ChainlinkAnswerVerifier contract in the QuestionManager first."
            }
          ]
        });
        return;
      }
      
      // Create a verifier contract instance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const verifierContract = new ethers.Contract(
        verifierAddress,
        [
          "function evaluationSource() view returns (string)"
        ],
        provider
      );
      
      // Fetch the source code
      try {
        const sourceCode = await verifierContract.evaluationSource();
        
        if (!sourceCode || sourceCode.trim() === "") {
          setLlmFormatStatus({
            status: "warning",
            title: "Source Code Not Set",
            message: "The JavaScript evaluation source code is not set in the ChainlinkAnswerVerifier.",
            recommendations: [
              {
                title: "Set Source Code",
                description: "You need to set the JavaScript evaluation source code in the ChainlinkAnswerVerifier contract."
              }
            ]
          });
          return;
        }
        
        // Analyze the source code
        let status = "success";
        let title = "Source Code Analysis Complete";
        let message = "The JavaScript code format appears to be correct.";
        let recommendations = [];
        
        // Check for byte32 handling patterns
        if (sourceCode.includes("bytes32") || sourceCode.includes("0x")) {
          // Check how the code might be processing the answersHash parameter
          if (sourceCode.includes("answersHash.substring(2)") || sourceCode.includes("slice(2)")) {
            status = "warning";
            title = "Potential Hash Format Issue";
            message = "The code appears to be processing the hash by removing the '0x' prefix. Ensure your hash includes the '0x' prefix.";
            recommendations.push({
              title: "Include 0x Prefix",
              description: "Make sure your answer hash includes the '0x' prefix when submitting."
            });
          }
          
          // Check for hex string length expectations
          const hexLengthCheck = sourceCode.match(/hash\.length\s*(===|==)\s*(\d+)/);
          if (hexLengthCheck && hexLengthCheck[2]) {
            const expectedLength = parseInt(hexLengthCheck[2]);
            if (expectedLength === 64) {
              status = "warning";
              title = "Hash Length Validation";
              message = "The code expects a 64-character hash (without 0x prefix). Make sure your hash is the correct length.";
              recommendations.push({
                title: "Check Hash Length",
                description: "Ensure your hash is exactly 64 characters long without the '0x' prefix (66 with prefix)."
              });
            }
          }
        }
        
        // Check for advanced LLM integration issues
        if (sourceCode.includes("openai") || sourceCode.includes("api.openai.com")) {
          status = "warning";
          title = "OpenAI API Integration Detected";
          message = "The code appears to be using OpenAI's API. Make sure correct API keys are provided as encrypted secrets.";
          recommendations.push({
            title: "Check API Keys",
            description: "Verify that you've configured Chainlink Functions with encrypted secrets for API access."
          });
        }
        
        setLlmFormatStatus({
          status,
          title,
          message,
          details: sourceCode,
          recommendations
        });
      } catch (error) {
        console.error("Error fetching source code:", error);
        setLlmFormatStatus({
          status: "error",
          title: "Error Fetching Source Code",
          message: `Failed to retrieve the source code: ${error.message}`,
          recommendations: [
            {
              title: "Check Contract Configuration",
              description: "Ensure the ChainlinkAnswerVerifier contract is properly deployed and configured."
            }
          ]
        });
      }
    } catch (error) {
      console.error("Error analyzing source code:", error);
      setLlmFormatStatus({
        status: "error",
        title: "Error Analyzing Source Code",
        message: "An error occurred while analyzing the source code.",
        details: error.message
      });
    } finally {
      setLlmFormatStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Add this function to test Chainlink Functions configuration
  const testChainlinkFunctions = async () => {
    try {
      setChainlinkFunctionTest({ 
        isLoading: true, 
        message: "Checking Chainlink Functions configuration..." 
      });
      
      // First get the verifier address from the question manager
      const verifierAddress = await questionManager.answerVerifier();
      
      if (verifierAddress === ethers.constants.AddressZero) {
        setChainlinkFunctionTest({
          status: "error",
          message: "The answer verifier address is not set in the QuestionManager.",
          subscriptionStatus: "unknown",
          donStatus: "unknown",
          secretsStatus: "unknown",
          testEvaluation: "unavailable"
        });
        return;
      }
      
      // Create a verifier contract instance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const verifierContract = new ethers.Contract(
        verifierAddress,
        [
          "function subscriptionId() view returns (uint64)",
          "function donId() view returns (bytes32)",
          "function evaluationSource() view returns (string)",
          "function testEvaluation(string memory mockAnswerHash) view returns (bool)",
          "function oracleAddress() view returns (address)",
          "function checkUpkeep(bytes) view returns (bool, bytes)"
        ],
        signer
      );
      
      // Check subscription ID
      let subscriptionStatus = "unknown";
      try {
        const subId = await verifierContract.subscriptionId();
        subscriptionStatus = subId.toString() === "0" ? "error" : "success";
      } catch (error) {
        console.error("Error checking subscription ID:", error);
        subscriptionStatus = "error";
      }
      
      // Check DON ID
      let donStatus = "unknown";
      try {
        const donId = await verifierContract.donId();
        donStatus = donId === ethers.constants.HashZero ? "error" : "success";
      } catch (error) {
        console.error("Error checking DON ID:", error);
        donStatus = "error";
      }
      
      // Check if there's a source code
      let sourceCode = "";
      let secretsStatus = "unknown";
      try {
        sourceCode = await verifierContract.evaluationSource();
        secretsStatus = sourceCode.includes("secrets") ? "warning" : "success";
      } catch (error) {
        console.error("Error checking source code:", error);
        secretsStatus = "error";
      }
      
      // Attempt a mock evaluation test if possible
      let testEvaluation = "unknown";
      try {
        if (verifierContract.testEvaluation) {
          // This is an optional function that may not exist in all implementations
          const testResult = await verifierContract.testEvaluation("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
          testEvaluation = testResult ? "success" : "error";
        } else {
          testEvaluation = "unavailable";
        }
      } catch (error) {
        console.error("Error running test evaluation:", error);
        testEvaluation = "error";
        if (error.message.includes("not a function")) {
          testEvaluation = "unavailable";
        }
      }
      
      // Aggregate results
      let status = "success";
      let message = "Chainlink Functions configuration appears to be correct.";
      
      if (subscriptionStatus === "error" || donStatus === "error") {
        status = "error";
        message = "Critical Chainlink Functions configuration issues detected.";
      } else if (secretsStatus === "warning" || testEvaluation === "error") {
        status = "warning";
        message = "Potential issues with Chainlink Functions configuration detected.";
      }
      
      setChainlinkFunctionTest({
        isLoading: false,
        status,
        message,
        subscriptionStatus,
        donStatus,
        secretsStatus,
        testEvaluation,
        sourceCode
      });
      
    } catch (error) {
      console.error("Error testing Chainlink Functions:", error);
      setChainlinkFunctionTest({
        isLoading: false,
        status: "error",
        message: "An error occurred while testing Chainlink Functions: " + error.message,
        subscriptionStatus: "unknown",
        donStatus: "unknown",
        secretsStatus: "unknown",
        testEvaluation: "unknown"
      });
    }
  };

  // Add this function to simulate the full call trace
  const simulateCallTrace = async () => {
    try {
      setCallTraceSimulator(prev => ({ ...prev, isLoading: true, result: null, error: null }));
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      
      // Format data for the submitAssessmentAnswers function call
      const questionSetId = callTraceSimulator.questionSetId;
      const answerHash = callTraceSimulator.answerHash;
      
      // Create a function to track each step in the process
      const steps = [];
      
      // Step 1: Check if the question set is active (which implies it exists)
      try {
        steps.push({ step: "Checking if question set exists and is active", status: "running" });
        const isActive = await questionManager.isQuestionSetActive(questionSetId);
        steps[steps.length - 1].status = isActive ? "success" : "error";
        steps[steps.length - 1].result = isActive ? "Question set is active" : "Question set is not active";
        
        if (!isActive) {
          throw new Error("Question set is not active");
        }
      } catch (error) {
        steps[steps.length - 1].status = "error";
        steps[steps.length - 1].result = `Error: ${error.message}`;
        throw error;
      }
      
      // Step 3: Check if the user has already submitted answers
      try {
        steps.push({ step: "Checking if user has already submitted answers", status: "running" });
        const hasCompleted = await questionManager.hasCompletedAssessment(signerAddress, questionSetId);
        steps[steps.length - 1].status = hasCompleted ? "warning" : "success";
        steps[steps.length - 1].result = hasCompleted ? 
          "User has already submitted answers (this may cause a revert)" : 
          "User has not submitted answers yet";
        
        if (hasCompleted) {
          steps.push({ 
            step: "Warning", 
            status: "warning", 
            result: "The contract may revert if you try to submit answers again" 
          });
        }
      } catch (error) {
        steps[steps.length - 1].status = "error";
        steps[steps.length - 1].result = `Error: ${error.message}`;
        // Continue despite error in this step
      }
      
      // Step 4: Get the verifier contract
      let verifierAddress;
      try {
        steps.push({ step: "Getting verifier contract address", status: "running" });
        verifierAddress = await questionManager.answerVerifier();
        steps[steps.length - 1].status = verifierAddress !== ethers.constants.AddressZero ? "success" : "error";
        steps[steps.length - 1].result = verifierAddress !== ethers.constants.AddressZero ? 
          `Verifier address: ${verifierAddress}` : 
          "Verifier address is not set";
        
        if (verifierAddress === ethers.constants.AddressZero) {
          throw new Error("Verifier address is not set");
        }
      } catch (error) {
        steps[steps.length - 1].status = "error";
        steps[steps.length - 1].result = `Error: ${error.message}`;
        throw error;
      }
      
      // Step 5: Check verifier configuration
      let verifierContract;
      try {
        steps.push({ step: "Checking verifier configuration", status: "running" });
        
        verifierContract = new ethers.Contract(
          verifierAddress,
          [
            "function subscriptionId() view returns (uint64)",
            "function donId() view returns (bytes32)",
            "function evaluationSource() view returns (string)",
            "function oracleAddress() view returns (address)"
          ],
          signer
        );
        
        const subId = await verifierContract.subscriptionId();
        const donId = await verifierContract.donId();
        const oracleAddress = await verifierContract.oracleAddress();
        
        const config = {
          subscriptionId: subId.toString(),
          donId: donId,
          oracleAddress: oracleAddress
        };
        
        const isConfigValid = 
          subId.toString() !== "0" && 
          donId !== ethers.constants.HashZero && 
          oracleAddress !== ethers.constants.AddressZero;
        
        steps[steps.length - 1].status = isConfigValid ? "success" : "warning";
        steps[steps.length - 1].result = isConfigValid ?
          `Verifier configuration is valid: ${JSON.stringify(config)}` :
          `Verifier configuration may have issues: ${JSON.stringify(config)}`;
      } catch (error) {
        steps[steps.length - 1].status = "error";
        steps[steps.length - 1].result = `Error: ${error.message}`;
        // Continue despite error in this step
      }
      
      // Step 6: Simulate the actual call
      try {
        steps.push({ step: "Simulating submitAssessmentAnswers call", status: "running" });
        
        // Create calldata for the function
        const questionManagerInterface = new ethers.utils.Interface([
          "function submitAssessmentAnswers(string calldata questionSetId, string calldata answersHash) external"
        ]);
        
        const calldata = questionManagerInterface.encodeFunctionData(
          "submitAssessmentAnswers", 
          [questionSetId, answerHash]
        );
        
        // Use call instead of send to simulate the transaction
        const tx = {
          from: signerAddress,
          to: questionManager.address,
          data: calldata
        };
        
        try {
          await provider.call(tx);
          steps[steps.length - 1].status = "success";
          steps[steps.length - 1].result = "Call simulation successful";
        } catch (error) {
          steps[steps.length - 1].status = "error";
          
          // Parse the error message
          let errorMessage = error.message;
          
          // Try to extract the revert reason
          if (errorMessage.includes("reverted with reason string")) {
            const reasonMatch = errorMessage.match(/'([^']*)'/) || errorMessage.match(/"([^"]*)"/);
            if (reasonMatch && reasonMatch[1]) {
              errorMessage = `Reverted with reason: ${reasonMatch[1]}`;
            }
          } else if (errorMessage.includes("reverted with custom error")) {
            errorMessage = "Reverted with custom error (see details)";
          } else if (errorMessage.includes("reverted without a reason")) {
            errorMessage = "Reverted without a reason (silent failure)";
          }
          
          steps[steps.length - 1].result = `Error: ${errorMessage}`;
          throw error;
        }
      } catch (error) {
        // Already handled in the inner catch
      }
      
      // Step 7: Trace the expected Chainlink Functions call (if possible)
      try {
        steps.push({ step: "Tracing expected Chainlink Functions call", status: "running" });
        
        // This is a hypothetical trace based on the contract flow
        steps[steps.length - 1].status = "info";
        steps[steps.length - 1].result = "Expected flow: submitAssessmentAnswers -> verifyAnswerSet -> Chainlink Functions request -> wait for callback";
        
        // Add note about potential issues at this stage
        steps.push({ 
          step: "Note on Chainlink Function call", 
          status: "info", 
          result: "If the transaction reverts after passing the initial validation, it's likely due to issues with the Chainlink Functions request setup. This could include: invalid subscriptionId, incorrect donId, or problems with the JavaScript evaluation source."
        });
      } catch (error) {
        steps[steps.length - 1].status = "error";
        steps[steps.length - 1].result = `Error: ${error.message}`;
      }
      
      // Set the final result
      setCallTraceSimulator(prev => ({ 
        ...prev, 
        isLoading: false, 
        result: {
          steps,
          success: steps.filter(s => s.status === "error").length === 0
        }
      }));
      
    } catch (error) {
      console.error("Error in call trace simulation:", error);
      setCallTraceSimulator(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message
      }));
    }
  };

  // For handling input changes
  const handleCallTraceInputChange = (e) => {
    const { name, value } = e.target;
    setCallTraceSimulator(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add this function to inspect contract interfaces
  const inspectContractInterface = async () => {
    try {
      setContractInterface(prev => ({ ...prev, isLoading: true, functions: null, error: null }));
      
      let contractInstance;
      let contractName;
      
      switch (contractInterface.selectedContract) {
        case "questionManager":
          contractInstance = questionManager;
          contractName = "QuestionManager";
          break;
        case "puzzlePoints":
          contractInstance = puzzlePoints;
          contractName = "PuzzlePoints";
          break;
        case "verifier":
          const verifierAddress = await questionManager.answerVerifier();
          if (verifierAddress === ethers.constants.AddressZero) {
            throw new Error("Verifier address is not set in the QuestionManager contract");
          }
          
          // Create a generic contract instance with a basic ABI to get the interface
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          contractInstance = new ethers.Contract(
            verifierAddress,
            [
              "function subscriptionId() view returns (uint64)",
              "function donId() view returns (bytes32)",
              "function evaluationSource() view returns (string)",
              "function oracleAddress() view returns (address)",
              "function verifyAnswerSet(string, string) external returns (bool)",
              "function testEvaluation(string) view returns (bool)"
            ],
            provider
          );
          contractName = "ChainlinkAnswerVerifier";
          break;
        default:
          throw new Error("Unknown contract selected");
      }
      
      // Extract function names from the contract interface
      const functions = [];
      
      if (contractInstance.interface && contractInstance.interface.fragments) {
        // Using interface.fragments which contains full function info
        for (const fragment of contractInstance.interface.fragments) {
          if (fragment.type === 'function') {
            functions.push({
              name: fragment.name,
              type: fragment.stateMutability,
              signature: fragment.format('full'),
              inputs: fragment.inputs.map(input => ({
                name: input.name,
                type: input.type
              })),
              outputs: fragment.outputs.map(output => ({
                name: output.name,
                type: output.type
              }))
            });
          }
        }
      } else {
        // Fallback approach if interface.fragments isn't available
        const prototype = Object.getPrototypeOf(contractInstance);
        const propNames = Object.getOwnPropertyNames(prototype);
        
        for (const prop of propNames) {
          if (typeof prototype[prop] === 'function' && !prop.startsWith('_') && prop !== 'constructor') {
            functions.push({
              name: prop,
              type: 'unknown',
              signature: prop,
              inputs: [],
              outputs: []
            });
          }
        }
      }
      
      setContractInterface(prev => ({
        ...prev,
        isLoading: false,
        functions: functions.sort((a, b) => a.name.localeCompare(b.name)),
        contractName,
        contractAddress: contractInstance.address
      }));
      
    } catch (error) {
      console.error("Error inspecting contract interface:", error);
      setContractInterface(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  // Handle contract selection
  const handleContractSelection = (e) => {
    setContractInterface(prev => ({
      ...prev,
      selectedContract: e.target.value,
      functions: null,
      error: null
    }));
  };

  return (
    <Container className="mt-4">
      <Card className="mb-4">
        <Card.Header as="h3">Admin Debug Panel</Card.Header>
        <Card.Body>
          <p>This page contains various debugging tools and information only available to admins.</p>
        </Card.Body>
      </Card>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Row>
        <Col md={6}>
          {/* Network Information */}
          <Card className="mb-4">
            <Card.Header as="h5">Network Information</Card.Header>
            <Card.Body>
              {networkInfo ? (
                <Table striped bordered>
                  <tbody>
                    <tr>
                      <td>Network Name</td>
                      <td>
                        {getNetworkName(networkInfo.chainId)}
                        {EXPLORER_URLS[networkInfo.chainId] ? (
                          <Badge bg="success" className="ms-2">Supported</Badge>
                        ) : (
                          <Badge bg="warning" text="dark" className="ms-2">Explorer Not Supported</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Chain ID</td>
                      <td>{networkInfo.chainId}</td>
                    </tr>
                    <tr>
                      <td>Connected Account</td>
                      <td>{renderAddressWithExplorer(account, networkInfo.chainId)}</td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <p>Loading network information...</p>
              )}
            </Card.Body>
          </Card>
          
          {/* Contract Information */}
          <Card className="mb-4">
            <Card.Header as="h5">Contract Information</Card.Header>
            <Card.Body>
              {Object.keys(contractInfo).length > 0 ? (
                <Table striped bordered>
                  <tbody>
                    {Object.entries(contractInfo).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>
                          {typeof value === 'string' && value.startsWith('0x') && value.length === 42 
                            ? renderAddressWithExplorer(value, networkInfo?.chainId)
                            : <small className="text-break">{value}</small>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>Loading contract information...</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          {/* PZL Token Stats */}
          <Card className="mb-4">
            <Card.Header as="h5">PZL Token Statistics</Card.Header>
            <Card.Body>
              <Table striped bordered>
                <tbody>
                  <tr>
                    <td>Total Supply</td>
                    <td>{totalSupply} PZL</td>
                  </tr>
                  <tr>
                    <td>Holder Count</td>
                    <td>{holderCount !== null ? holderCount : 'Not available'}</td>
                  </tr>
                  <tr>
                    <td>PuzzlePoints Contract</td>
                    <td>
                      {renderAddressWithExplorer(CONTRACT_ADDRESSES.puzzlePoints, networkInfo?.chainId)}
                    </td>
                  </tr>
                  <tr>
                    <td>QuestionManager Contract</td>
                    <td>
                      {renderAddressWithExplorer(CONTRACT_ADDRESSES.questionManager, networkInfo?.chainId)}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
          {/* Balance Checker */}
          <Card className="mb-4">
            <Card.Header as="h5">Balance Checker</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Enter Address to Check</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="0x..."
                  value={testAddress}
                  onChange={(e) => setTestAddress(e.target.value)}
                />
              </Form.Group>
              
              <Button variant="primary" onClick={checkBalance}>
                Check Balance
              </Button>
              
              {testAddressBalance && (
                <div className="mt-3">
                  {testAddressBalance.error ? (
                    <Alert variant="danger">{testAddressBalance.error}</Alert>
                  ) : (
                    <Alert variant="info">
                      <p><strong>Address:</strong> {renderAddressWithExplorer(testAddressBalance.address, networkInfo?.chainId)}</p>
                      <p><strong>Balance:</strong> {testAddressBalance.balance} PZL</p>
                      {testAddressBalance.isHolder !== undefined && (
                        <p><strong>Is Holder:</strong> {testAddressBalance.isHolder ? 'Yes' : 'No'}</p>
                      )}
                    </Alert>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          {/* Token Minter */}
          <Card className="mb-4">
            <Card.Header as="h5">Token Minter</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Recipient Address</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="0x..."
                  value={mintAddress}
                  onChange={(e) => setMintAddress(e.target.value)}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Amount to Mint</Form.Label>
                <Form.Control 
                  type="number" 
                  placeholder="10"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                />
              </Form.Group>
              
              <Button variant="success" onClick={mintTokens}>
                Mint Tokens
              </Button>
              
              {mintStatus && (
                <Alert variant={mintStatus.type} className="mt-3">
                  {mintStatus.message}
                  {mintStatus.address && mintStatus.type === 'success' && (
                    <div className="mt-2">
                      {renderAddressWithExplorer(mintStatus.address, networkInfo?.chainId)}
                    </div>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          {/* Submission Test Section */}
          <Card className="mb-4">
            <Card.Header as="h5">Submission Test</Card.Header>
            <Card.Body>
              <p className="text-muted small">
                Try submitting a minimal test question set with the simplest possible data to diagnose permission/contract issues.
              </p>
              
              <div className="d-flex gap-2 mb-3">
                <Button variant="primary" size="sm" onClick={testMinimalSubmission}>
                  Test Minimal Submission
                </Button>
                <Button variant="warning" size="sm" onClick={circuitBreakerTest}>
                  Circuit Breaker Test
                </Button>
                <Button variant="info" size="sm" onClick={checkAdminAccount}>
                  Check Admin Account
                </Button>
                <Button variant="danger" size="sm" onClick={runDeepDiagnostics}>
                  Deep Diagnostics
                </Button>
              </div>
              
              {submissionTestStatus && (
                <Alert variant={submissionTestStatus.type} className="mt-3">
                  <strong>{submissionTestStatus.message}</strong>
                  
                  {submissionTestStatus.details && (
                    <div className="mt-2">
                      <h6>Diagnostic Details:</h6>
                      <ListGroup>
                        {submissionTestStatus.details.map((check, index) => (
                          <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                            {check.name}
                            {check.status ? 
                              <Badge bg="success">Pass</Badge> : 
                              <Badge bg="danger">Fail</Badge>
                            }
                            {check.error && <small className="text-danger d-block">{check.error}</small>}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          {/* Chainlink Assessment Diagnostic */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Chainlink Assessment Diagnostics</h5>
              <Button 
                variant="primary" 
                size="sm"
                onClick={runChainlinkDiagnostics}
                disabled={diagnosticsLoading}
              >
                {diagnosticsLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Running...
                  </>
                ) : "Run Diagnostics"}
              </Button>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Question Set ID</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter question set ID (e.g., 'univ2')" 
                  value={testQuestionSetId}
                  onChange={(e) => setTestQuestionSetId(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Enter the ID of the question set you want to test
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Test Answers Hash</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="0x0000000000000000000000000000000000000000000000000000000000000000" 
                  value={testAnswersHash}
                  onChange={(e) => setTestAnswersHash(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Hash of test answers (defaults to zero hash for testing)
                </Form.Text>
              </Form.Group>
              
              {!diagnosticsResults && !diagnosticsError && !diagnosticsLoading && (
                <Alert variant="info">
                  Enter a Question Set ID and click "Run Diagnostics" to check your Chainlink assessment setup.
                  This will analyze potential issues with gas estimation for assessment submission.
                </Alert>
              )}
              
              {diagnosticsError && (
                <Alert variant="danger">
                  <Alert.Heading>Error</Alert.Heading>
                  <p>{diagnosticsError}</p>
                </Alert>
              )}
              
              {diagnosticsResults && (
                <>
                  <Alert variant={getAlertVariant(diagnosticsResults)}>
                    <Alert.Heading>
                      {diagnosticsResults.success ? "✅ Ready for submission" : "❌ Submission issues detected"}
                    </Alert.Heading>
                    <p>
                      {diagnosticsResults.success 
                        ? "Gas estimation successful. Your assessment can be submitted."
                        : diagnosticsResults.details || "There were issues with the gas estimation. See details below."}
                    </p>
                  </Alert>
                  
                  <h6>Diagnostic Results:</h6>
                  <ListGroup className="mb-3">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      Gas Estimation
                      {renderStatusBadge(diagnosticsResults.success)}
                    </ListGroup.Item>
                    
                    {diagnosticsResults.gasEstimate && (
                      <ListGroup.Item>
                        <small className="text-muted">Estimated Gas:</small> 
                        <div>{diagnosticsResults.gasEstimate}</div>
                      </ListGroup.Item>
                    )}
                    
                    {diagnosticsResults.error && (
                      <ListGroup.Item>
                        <small className="text-muted">Error Message:</small>
                        <div className="text-danger">{diagnosticsResults.error}</div>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                  
                  {!diagnosticsResults.success && (
                    <div className="mt-3">
                      <h6>Troubleshooting Steps:</h6>
                      {diagnosticsResults.error === 'Authorization error' && (
                        <Alert variant="warning">
                          <strong>Authorization Issue:</strong> The QuestionManager is not authorized to call the ChainlinkAnswerVerifier.
                          <div className="mt-2">
                            <strong>Fix:</strong> Run this command in your terminal:
                            <pre className="bg-dark text-light p-2 mt-1">
                              npx hardhat setup-chainlink-connection --network baseSepoliaTestnet
                            </pre>
                          </div>
                        </Alert>
                      )}
                      
                      {(diagnosticsResults.error === 'Missing source code' || diagnosticsResults.error === 'Error accessing source code') && (
                        <Alert variant="warning">
                          <strong>Source Code Issue:</strong> The evaluation source code is not properly set in the ChainlinkAnswerVerifier.
                          <div className="mt-2">
                            <strong>Fix:</strong> Update the source code in the Chainlink Setup panel or run:
                            <pre className="bg-dark text-light p-2 mt-1">
                              npx hardhat update-chainlink --network baseSepoliaTestnet
                            </pre>
                          </div>
                        </Alert>
                      )}
                      
                      {diagnosticsResults.error === 'Missing subscription ID' && (
                        <Alert variant="warning">
                          <strong>Subscription ID Issue:</strong> The Chainlink subscription ID is not configured.
                          <div className="mt-2">
                            <strong>Fix:</strong> Update the subscription ID in the Chainlink Setup panel or run:
                            <pre className="bg-dark text-light p-2 mt-1">
                              npx hardhat update-chainlink --network baseSepoliaTestnet
                            </pre>
                          </div>
                        </Alert>
                      )}
                      
                      {diagnosticsResults.error === 'Assessment already being verified' && (
                        <Alert variant="warning">
                          <strong>Assessment Status Issue:</strong> This assessment is already in the verification process.
                          <div className="mt-2">
                            <strong>Fix:</strong> Wait for verification to complete, or reset the assessment status.
                          </div>
                        </Alert>
                      )}
                      
                      {diagnosticsResults.error === 'Insufficient funds' && (
                        <Alert variant="warning">
                          <strong>Wallet Issue:</strong> Your wallet doesn't have enough ETH to cover gas costs.
                          <div className="mt-2">
                            <strong>Fix:</strong> Get testnet ETH from a faucet:
                            <a 
                              href="https://www.coinbase.com/faucets/base-sepolia-faucet" 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-block mt-1"
                            >
                              Base Sepolia Faucet
                            </a>
                          </div>
                        </Alert>
                      )}
                      
                      {/* General case if none of the specific errors match */}
                      {!['Authorization error', 'Missing source code', 'Error accessing source code', 
                         'Missing subscription ID', 'Assessment already being verified', 'Insufficient funds'].includes(diagnosticsResults.error) && (
                        <Alert variant="warning">
                          <strong>General Issue:</strong> There was a problem with the gas estimation.
                          <div className="mt-2">
                            <strong>Debugging:</strong> Run the comprehensive test script:
                            <pre className="bg-dark text-light p-2 mt-1">
                              npm run test:chainlink-setup
                            </pre>
                          </div>
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
              
              <div className="text-muted mt-3">
                <small>
                  📋 This tool helps identify issues with Chainlink Functions assessment submission.
                  For more detailed diagnostics, run <code>npm run test:chainlink-setup</code> in your terminal.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          {/* Question Set Verification */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Question Set Verification</h5>
              <div className="d-flex gap-2">
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={verifyQuestionSetExists}
                >
                  Verify Question Set
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={checkLocalStorageQuestionSets}
                >
                  Check Local Storage
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Question Set ID</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter question set ID (e.g., 'univ2')" 
                  value={verifyQuestionSetId}
                  onChange={(e) => setVerifyQuestionSetId(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Enter the ID of the question set you want to verify
                </Form.Text>
              </Form.Group>
              
              {questionSetVerificationResult && (
                <Alert variant={questionSetVerificationResult.status === 'success' ? 'success' : 'danger'}>
                  <Alert.Heading>
                    {questionSetVerificationResult.status === 'success' ? "✅ Question Set Verified" : "❌ Verification Error"}
                  </Alert.Heading>
                  <p>
                    {questionSetVerificationResult.message}
                  </p>
                  {questionSetVerificationResult.details && (
                    <div className="mt-2">
                      <h6>Verification Details:</h6>
                      <ListGroup>
                        {Object.entries(questionSetVerificationResult.details).map(([key, value]) => (
                          <ListGroup.Item key={key} className="d-flex justify-content-between align-items-center">
                            {key}
                            <div>{value}</div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}
                </Alert>
              )}
              
              {localStorageQuestionSets && (
                <div className="mt-4">
                  <h6>Local Storage Question Sets</h6>
                  {localStorageQuestionSets.error ? (
                    <Alert variant="danger">
                      Error loading localStorage data: {localStorageQuestionSets.error}
                    </Alert>
                  ) : localStorageQuestionSets.length === 0 ? (
                    <Alert variant="warning">
                      No question sets found in localStorage.
                    </Alert>
                  ) : (
                    <div className="mt-2">
                      <div className="d-flex justify-content-end mb-2">
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to clear all locally stored question sets?')) {
                              localStorage.removeItem('questionSets');
                              checkLocalStorageQuestionSets();
                            }
                          }}
                        >
                          Clear Local Storage
                        </Button>
                      </div>
                      
                      {manualSubmitStatus && (
                        <Alert 
                          variant={
                            manualSubmitStatus.status === 'success' ? 'success' : 
                            manualSubmitStatus.status === 'loading' || manualSubmitStatus.status === 'pending' ? 'info' : 
                            'danger'
                          }
                          className="mb-3"
                        >
                          <Alert.Heading>
                            {manualSubmitStatus.status === 'success' ? '✅ Success' :
                             manualSubmitStatus.status === 'loading' ? '⏳ Processing...' :
                             manualSubmitStatus.status === 'pending' ? '🔄 Transaction Pending' :
                             '❌ Error'}
                          </Alert.Heading>
                          <p>{manualSubmitStatus.message}</p>
                          
                          {manualSubmitStatus.txHash && (
                            <div className="mt-2">
                              <strong>Transaction Hash:</strong>{' '}
                              {networkInfo?.chainId && getTxExplorerUrl(manualSubmitStatus.txHash, networkInfo.chainId) ? (
                                <a 
                                  href={getTxExplorerUrl(manualSubmitStatus.txHash, networkInfo.chainId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {manualSubmitStatus.txHash.substring(0, 10)}...
                                </a>
                              ) : (
                                <code>{manualSubmitStatus.txHash}</code>
                              )}
                            </div>
                          )}
                          
                          {manualSubmitStatus.blockNumber && (
                            <div className="mt-1">
                              <strong>Block:</strong> {manualSubmitStatus.blockNumber}
                            </div>
                          )}
                        </Alert>
                      )}
                      
                      <ListGroup>
                        {localStorageQuestionSets.map((set, index) => (
                          <ListGroup.Item key={index} className="mb-2">
                            <div className="d-flex justify-content-between mb-1">
                              <strong>ID: {set.id}</strong>
                              <Badge bg="primary">{set.questionCount} Questions</Badge>
                            </div>
                            <div><small>Content Hash: {set.contentHash}</small></div>
                            <div><small>Created: {new Date(set.timestamp).toLocaleString()}</small></div>
                            <div><small>Type: {set.questionType || 'Unknown'}</small></div>
                            <div className="mt-2 d-flex gap-2">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => {
                                  setVerifyQuestionSetId(set.id);
                                  verifyQuestionSetExists();
                                }}
                              >
                                Verify this set
                              </Button>
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => submitSelectedQuestionSet(set)}
                              >
                                Submit to Contract
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          {/* Replace the existing Manual Answer Submission card with an Accordion */}
          <Accordion className="mb-4">
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                <h5 className="mb-0">Question Submission Tools (Admin)</h5>
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={6}>
                    <Card className="mb-4">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Manual Answer Submission (Fixed Gas)</h5>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={submitAnswersWithFixedGas}
                          disabled={manualAnswerSubmitStatus?.status === 'loading' || manualAnswerSubmitStatus?.status === 'pending'}
                        >
                          {manualAnswerSubmitStatus?.status === 'loading' || manualAnswerSubmitStatus?.status === 'pending' ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Submitting...
                            </>
                          ) : "Submit with Fixed Gas"}
                        </Button>
                      </Card.Header>
                      <Card.Body>
                        <Alert variant="warning" className="mb-3">
                          <strong>Warning:</strong> This bypasses gas estimation and attempts to submit with a fixed gas limit. 
                          Use this only when normal submission fails with gas estimation errors.
                        </Alert>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Question Set ID</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={manualAnswerQuestionSetId}
                            onChange={(e) => setManualAnswerQuestionSetId(e.target.value)}
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Answer Hash</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={manualAnswerHash}
                            onChange={(e) => setManualAnswerHash(e.target.value)}
                          />
                          <Form.Text className="text-muted">
                            Hex-encoded answer hash (e.g., 0x1111...1111)
                          </Form.Text>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Gas Limit</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={manualGasLimit}
                            onChange={(e) => setManualGasLimit(e.target.value)}
                          />
                          <Form.Text className="text-muted">
                            Manual gas limit to use (default: 500000)
                          </Form.Text>
                        </Form.Group>
                        
                        {manualAnswerSubmitStatus && (
                          <Alert 
                            variant={
                              manualAnswerSubmitStatus.status === 'success' ? 'success' : 
                              manualAnswerSubmitStatus.status === 'loading' || manualAnswerSubmitStatus.status === 'pending' ? 'info' : 
                              'danger'
                            }
                            className="mt-3"
                          >
                            <Alert.Heading>
                              {manualAnswerSubmitStatus.status === 'success' ? '✅ Success' :
                              manualAnswerSubmitStatus.status === 'loading' ? '⏳ Processing...' :
                              manualAnswerSubmitStatus.status === 'pending' ? '🔄 Transaction Pending' :
                              '❌ Error'}
                            </Alert.Heading>
                            <p>{manualAnswerSubmitStatus.message}</p>
                            
                            {manualAnswerSubmitStatus.txHash && (
                              <div className="mt-2">
                                <strong>Transaction Hash:</strong>{' '}
                                {networkInfo?.chainId && getTxExplorerUrl(manualAnswerSubmitStatus.txHash, networkInfo.chainId) ? (
                                  <a 
                                    href={getTxExplorerUrl(manualAnswerSubmitStatus.txHash, networkInfo.chainId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {manualAnswerSubmitStatus.txHash}
                                  </a>
                                ) : (
                                  <code>{manualAnswerSubmitStatus.txHash}</code>
                                )}
                              </div>
                            )}
                            
                            {manualAnswerSubmitStatus.blockNumber && (
                              <div className="mt-1">
                                <strong>Block:</strong> {manualAnswerSubmitStatus.blockNumber}
                              </div>
                            )}
                            
                            {manualAnswerSubmitStatus.details && (
                              <div className="mt-2">
                                <details>
                                  <summary>Detailed Error</summary>
                                  <pre className="bg-dark text-light p-2 mt-1" style={{ maxHeight: '200px', overflow: 'auto' }}>
                                    {manualAnswerSubmitStatus.details}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </Alert>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col md={6}>
                    {/* Transaction Revert Reason Diagnostic */}
                    <Card className="mb-4">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Diagnose Revert Reason</h5>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={diagnoseTxRevertReason}
                          disabled={isStaticCallLoading}
                        >
                          {isStaticCallLoading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Analyzing...
                            </>
                          ) : "Run Diagnostic"}
                        </Button>
                      </Card.Header>
                      <Card.Body>
                        <Alert variant="info" className="mb-3">
                          <strong>Advanced Troubleshooting:</strong> This tool simulates a transaction to capture the 
                          exact reason why a contract is reverting, which can help identify permission issues,
                          validation failures, or other constraints.
                        </Alert>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Question Set ID</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={staticCallQuestionSetId}
                            onChange={(e) => setStaticCallQuestionSetId(e.target.value)}
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Answer Hash</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={staticCallAnswerHash}
                            onChange={(e) => setStaticCallAnswerHash(e.target.value)}
                          />
                          <Form.Text className="text-muted">
                            Hex-encoded answer hash to test
                          </Form.Text>
                        </Form.Group>
                        
                        {staticCallResult && (
                          <Alert 
                            variant={staticCallResult.status === 'success' ? 'success' : 
                                    staticCallResult.status === 'loading' ? 'info' : 'danger'}
                            className="mt-3"
                          >
                            <Alert.Heading>
                              {staticCallResult.status === 'success' ? '✅ Success' :
                              staticCallResult.status === 'loading' ? '⏳ Analyzing...' :
                              '❌ Error'}
                            </Alert.Heading>
                            <p>{staticCallResult.message}</p>
                            
                            {staticCallResult.details && (
                              <div className="mt-2">
                                <h6>Detailed Diagnosis:</h6>
                                <ListGroup>
                                  {Object.entries(staticCallResult.details).map(([key, value]) => (
                                    <ListGroup.Item key={key}>
                                      <strong>{key}:</strong>
                                      {key === 'rawError' ? (
                                        <details>
                                          <summary>Show Raw Error</summary>
                                          <pre className="bg-dark text-light p-2 mt-1" style={{ maxHeight: '150px', overflow: 'auto' }}>
                                            {value}
                                          </pre>
                                        </details>
                                      ) : (
                                        <div className="mt-1">{value}</div>
                                      )}
                                    </ListGroup.Item>
                                  ))}
                                </ListGroup>
                              </div>
                            )}
                          </Alert>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Accordion className="mb-4">
            <Accordion.Item eventKey="1">
              <Accordion.Header>
                <h5 className="mb-0">JSON Blob Inspector & Simulation</h5>
              </Accordion.Header>
              <Accordion.Body>
                <Alert variant="info">
                  <strong>Decentralized Storage Simulator:</strong> This tool helps validate and test JSON blobs before submitting them to the blockchain. 
                  It simulates how your app will work with decentralized storage by keeping content off-chain and only storing content hashes on-chain.
                </Alert>
                
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>JSON Content</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={10}
                        placeholder='Enter JSON content (e.g., {"answers": [true, false, true]})'
                        value={jsonBlobInspector.jsonContent}
                        onChange={(e) => setJsonBlobInspector(prev => ({ ...prev, jsonContent: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blob Type</Form.Label>
                      <Form.Select
                        value={jsonBlobInspector.blobType}
                        onChange={(e) => setJsonBlobInspector(prev => ({ ...prev, blobType: e.target.value }))}
                      >
                        <option value="answers">Answers Blob</option>
                        <option value="questions">Question Set Blob</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Select the type of JSON blob you're validating
                      </Form.Text>
                    </Form.Group>
                    
                    <div className="d-grid gap-2">
                      <Button 
                        variant="primary" 
                        onClick={validateJsonBlob}
                        disabled={jsonBlobInspector.isLoading}
                      >
                        {jsonBlobInspector.isLoading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Processing...
                          </>
                        ) : "Validate & Simulate"}
                      </Button>
                      
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => {
                          if (jsonBlobInspector.blobType === 'answers') {
                            setJsonBlobInspector(prev => ({
                              ...prev, 
                              jsonContent: JSON.stringify({
                                answers: [true, false, true, true, false]
                              }, null, 2)
                            }));
                          } else {
                            setJsonBlobInspector(prev => ({
                              ...prev, 
                              jsonContent: JSON.stringify({
                                questions: [
                                  { text: "Sample Question 1", options: ["A", "B", "C"] },
                                  { text: "Sample Question 2", options: ["True", "False"] }
                                ]
                              }, null, 2)
                            }));
                          }
                        }}
                      >
                        Load Sample
                      </Button>
                    </div>
                  </Col>
                </Row>
                
                {jsonBlobInspector.validationResult && (
                  <Alert 
                    variant={jsonBlobInspector.validationResult.valid ? "success" : "danger"}
                    className="mt-3"
                  >
                    <Alert.Heading>
                      {jsonBlobInspector.validationResult.valid ? "✅ Validation Successful" : "❌ Validation Failed"}
                    </Alert.Heading>
                    <p>{jsonBlobInspector.validationResult.message}</p>
                    
                    {jsonBlobInspector.validationResult.contentHash && (
                      <div className="mt-2">
                        <strong>Content Hash:</strong> <code>{jsonBlobInspector.validationResult.contentHash}</code>
                        <div className="mt-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              if (jsonBlobInspector.blobType === 'answers') {
                                setManualAnswerHash(jsonBlobInspector.validationResult.contentHash);
                                setStaticCallAnswerHash(jsonBlobInspector.validationResult.contentHash);
                              }
                            }}
                          >
                            Use This Hash for Answer Submission
                          </Button>
                        </div>
                      </div>
                    )}
                  </Alert>
                )}
                
                {jsonBlobInspector.simulationResult && (
                  <Alert 
                    variant={jsonBlobInspector.simulationResult.success ? "success" : "danger"}
                    className="mt-3"
                  >
                    <Alert.Heading>
                      {jsonBlobInspector.simulationResult.success ? "✅ Simulation Successful" : "❌ Simulation Failed"}
                    </Alert.Heading>
                    <p>{jsonBlobInspector.simulationResult.message}</p>
                    
                    {jsonBlobInspector.simulationResult.error && (
                      <div className="mt-2">
                        <strong>Error Details:</strong>
                        <pre className="bg-dark text-light p-2 mt-1" style={{ maxHeight: '150px', overflow: 'auto' }}>
                          {jsonBlobInspector.simulationResult.error}
                        </pre>
                      </div>
                    )}
                  </Alert>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Chainlink Verifier Configuration</h5>
              <Button 
                variant="primary" 
                size="sm"
                onClick={checkChainlinkConfiguration}
                disabled={chainlinkConfigStatus?.isLoading}
              >
                {chainlinkConfigStatus?.isLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Checking...
                  </>
                ) : "Check Configuration"}
              </Button>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3">
                <strong>Configuration Checker:</strong> This tool verifies if your Chainlink Functions integration is properly set up.
                It checks all required configuration parameters that might cause transactions to revert if not set correctly.
              </Alert>
              
              {!chainlinkConfigStatus && (
                <p className="text-center text-muted">Click "Check Configuration" to analyze your Chainlink setup.</p>
              )}
              
              {chainlinkConfigStatus && chainlinkConfigStatus.status && (
                <Alert 
                  variant={chainlinkConfigStatus.status}
                  className="mt-3"
                >
                  <Alert.Heading>
                    {chainlinkConfigStatus.status === "success" ? "✅ Configuration Check Passed" : 
                     chainlinkConfigStatus.status === "warning" ? "⚠️ Configuration Incomplete" :
                     "❌ Configuration Error"}
                  </Alert.Heading>
                  <p>{chainlinkConfigStatus.message}</p>
                  
                  {chainlinkConfigStatus.results && (
                    <div className="mt-3">
                      <h6>Configuration Details:</h6>
                      <ListGroup>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          Verifier Contract
                          <div>
                            <Badge bg="info">
                              {chainlinkConfigStatus.results.verifierAddress.substring(0, 8)}...
                            </Badge>
                          </div>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          QuestionManager Authorized
                          <div>
                            {chainlinkConfigStatus.results.isAuthorized ? (
                              <Badge bg="success">Yes</Badge>
                            ) : (
                              <Badge bg="danger">No</Badge>
                            )}
                          </div>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          Evaluation Source Code
                          <div>
                            {chainlinkConfigStatus.results.evaluationSourceSet ? (
                              <Badge bg="success">Set ({chainlinkConfigStatus.results.details.evaluationSourceLength} bytes)</Badge>
                            ) : (
                              <Badge bg="danger">Not Set</Badge>
                            )}
                          </div>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          Subscription ID
                          <div>
                            {chainlinkConfigStatus.results.subscriptionIdSet ? (
                              <Badge bg="success">{chainlinkConfigStatus.results.details.subscriptionId}</Badge>
                            ) : (
                              <Badge bg="danger">Not Set</Badge>
                            )}
                          </div>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          DON ID
                          <div>
                            {chainlinkConfigStatus.results.donIdSet ? (
                              <Badge bg="success">Set</Badge>
                            ) : (
                              <Badge bg="danger">Not Set</Badge>
                            )}
                          </div>
                        </ListGroup.Item>
                      </ListGroup>
                      
                      {!chainlinkConfigStatus.results.isAuthorized && (
                        <div className="mt-3">
                          <Alert variant="warning">
                            <strong>Authorization Issue:</strong> The QuestionManager is not authorized as a caller in the ChainlinkAnswerVerifier contract.
                            <p className="mt-2">This will cause transactions to revert when submitting answers.</p>
                          </Alert>
                        </div>
                      )}
                      
                      {!chainlinkConfigStatus.results.evaluationSourceSet && (
                        <div className="mt-3">
                          <Alert variant="warning">
                            <strong>Missing Evaluation Source:</strong> The JavaScript evaluation source code is not set in the ChainlinkAnswerVerifier.
                            <p className="mt-2">This will cause transactions to revert with "Source code not set".</p>
                          </Alert>
                        </div>
                      )}
                      
                      {!chainlinkConfigStatus.results.subscriptionIdSet && (
                        <div className="mt-3">
                          <Alert variant="warning">
                            <strong>Missing Subscription ID:</strong> The Chainlink Functions subscription ID is not set.
                            <p className="mt-2">This will cause transactions to revert with "Subscription ID not set".</p>
                          </Alert>
                        </div>
                      )}
                    </div>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">LLM Answer Test Submission</h5>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => {
                  const randomHash = ethers.utils.hexlify(ethers.utils.randomBytes(32));
                  setManualAnswerHash(randomHash);
                  setStaticCallAnswerHash(randomHash);
                }}
              >
                Generate Random Hash
              </Button>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3">
                <strong>Testing Tool:</strong> Since your answers are evaluated by an AI LLM through Chainlink, this tool helps test different hash 
                values to see if any specific pattern is causing the issue.
              </Alert>
              
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Test Different Hash Values</Form.Label>
                    <div className="d-grid gap-2">
                      {[
                        { value: "0x0000000000000000000000000000000000000000000000000000000000000001", label: "Minimal Test Hash (0x01)" },
                        { value: "0x2222222222222222222222222222222222222222222222222222222222222222", label: "Alternative Test Hash (0x22...)" },
                        { value: "0x0000000000000000000000000000000000000000000000000000000000000000", label: "Zero Hash (All Zeros)" },
                        { value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", label: "Maximum Hash (All Fs)" }
                      ].map((hash, index) => (
                        <Button 
                          key={index} 
                          variant="outline-secondary"
                          onClick={() => {
                            setManualAnswerHash(hash.value);
                            setStaticCallAnswerHash(hash.value);
                            // Set the test question set id to univ2
                            setManualAnswerQuestionSetId("univ2");
                            setStaticCallQuestionSetId("univ2");
                          }}
                          className="text-start"
                        >
                          <span className="d-block">{hash.label}</span>
                          <small className="text-muted">{hash.value}</small>
                        </Button>
                      ))}
                    </div>
                  </Form.Group>
                  
                  <div className="d-grid gap-2 mt-4">
                    <Button
                      variant="success"
                      onClick={() => {
                        // Set it all up and then call the manual submission function
                        setManualGasLimit("2000000"); // Set a high gas limit
                        setTimeout(submitAnswersWithFixedGas, 100);
                      }}
                    >
                      Submit Selected Hash with High Gas Limit
                    </Button>
                    
                    <Button
                      variant="outline-primary"
                      onClick={diagnoseTxRevertReason}
                    >
                      Run Static Call Diagnosis First
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <Alert variant="warning">
                    <strong>AI LLM Testing Strategy:</strong>
                    <p className="mt-2">Since the issues appear to be in the Chainlink Functions integration with your AI LLM:</p>
                    <ol className="ps-3">
                      <li>Try submitting with different hash values</li>
                      <li>Check if the problem is specific to your answer content</li>
                      <li>Run the static call diagnosis to see detailed errors</li>
                      <li>Use a high gas limit (2 million) to avoid estimation issues</li>
                    </ol>
                    <p className="mt-2">If submission succeeds with a different hash, the issue is likely in how your LLM evaluates specific answer content.</p>
                  </Alert>
                </Col>
              </Row>
              
              <hr />
              
              <h5>Chainlink Functions Bypass Test</h5>
              <p>If you suspect the issue is with Chainlink Functions itself, you can temporarily disable it:</p>
              
              <div className="d-flex gap-2">
                <Button
                  variant="warning"
                  onClick={async () => {
                    try {
                      setManualAnswerSubmitStatus({
                        status: 'loading',
                        message: `Disabling Chainlink Functions temporarily...`
                      });
                      
                      // Create a contract instance with the right function
                      const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
                      const tempContract = new ethers.Contract(
                        questionManager.address,
                        ["function setUseChainlinkFunctions(bool) external"],
                        signer
                      );
                      
                      // Call the function to disable Chainlink Functions
                      const tx = await tempContract.setUseChainlinkFunctions(false);
                      
                      setManualAnswerSubmitStatus({
                        status: 'pending',
                        message: `Transaction submitted! Waiting for confirmation...`,
                        txHash: tx.hash
                      });
                      
                      // Wait for confirmation
                      await tx.wait();
                      
                      setManualAnswerSubmitStatus({
                        status: 'success',
                        message: `Chainlink Functions temporarily disabled. You can now submit answers without using Chainlink.`,
                        txHash: tx.hash
                      });
                    } catch (error) {
                      console.error("Error disabling Chainlink Functions:", error);
                      setManualAnswerSubmitStatus({
                        status: 'error',
                        message: `Error disabling Chainlink Functions: ${error.message}`
                      });
                    }
                  }}
                >
                  Temporarily Disable Chainlink Functions
                </Button>
                
                <Button
                  variant="outline-secondary"
                  onClick={async () => {
                    try {
                      setManualAnswerSubmitStatus({
                        status: 'loading',
                        message: `Re-enabling Chainlink Functions...`
                      });
                      
                      // Create a contract instance with the right function
                      const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
                      const tempContract = new ethers.Contract(
                        questionManager.address,
                        ["function setUseChainlinkFunctions(bool) external"],
                        signer
                      );
                      
                      // Call the function to enable Chainlink Functions
                      const tx = await tempContract.setUseChainlinkFunctions(true);
                      
                      setManualAnswerSubmitStatus({
                        status: 'pending',
                        message: `Transaction submitted! Waiting for confirmation...`,
                        txHash: tx.hash
                      });
                      
                      // Wait for confirmation
                      await tx.wait();
                      
                      setManualAnswerSubmitStatus({
                        status: 'success',
                        message: `Chainlink Functions re-enabled.`,
                        txHash: tx.hash
                      });
                    } catch (error) {
                      console.error("Error enabling Chainlink Functions:", error);
                      setManualAnswerSubmitStatus({
                        status: 'error',
                        message: `Error enabling Chainlink Functions: ${error.message}`
                      });
                    }
                  }}
                >
                  Re-enable Chainlink Functions
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">LLM Answer Format Inspector</h5>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => checkChainlinkJsFormat()}
              >
                Analyze Source Code
              </Button>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3">
                <strong>LLM Format Inspector:</strong> This tool analyzes your Chainlink JavaScript code to identify any 
                formatting requirements for the answer hash that might be causing submission issues.
              </Alert>
              
              <div>
                {llmFormatStatus ? (
                  <div>
                    <Alert variant={llmFormatStatus.status}>
                      <strong>{llmFormatStatus.title}</strong>
                      <p className="mt-2">{llmFormatStatus.message}</p>
                    </Alert>
                    
                    {llmFormatStatus.details && (
                      <div className="mt-3">
                        <h6>Source Code Analysis:</h6>
                        <pre className="bg-dark text-light p-3" style={{maxHeight: '200px', overflow: 'auto'}}>
                          {llmFormatStatus.details}
                        </pre>
                      </div>
                    )}
                    
                    {llmFormatStatus.recommendations && (
                      <div className="mt-3">
                        <h6>Recommendations:</h6>
                        <ListGroup>
                          {llmFormatStatus.recommendations.map((rec, idx) => (
                            <ListGroup.Item key={idx}>
                              <strong>{rec.title}</strong>
                              <p className="mb-0 mt-1">{rec.description}</p>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center">Click "Analyze Source Code" to inspect the Chainlink JavaScript format requirements.</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="mt-3">
            <Card.Header>Chainlink Functions Test</Card.Header>
            <Card.Body>
              <Alert variant="info">
                This tool will check your Chainlink Functions configuration and test if the evaluation 
                can work with minimal test data. This can help identify if there are issues with your 
                Chainlink Functions setup that might be causing answer verification to fail.
              </Alert>
              
              <Button 
                variant="primary" 
                onClick={testChainlinkFunctions}
                disabled={chainlinkFunctionTest.isLoading}
              >
                {chainlinkFunctionTest.isLoading ? 'Testing...' : 'Test Chainlink Functions'}
              </Button>
              
              {chainlinkFunctionTest.status && (
                <div className="mt-3">
                  <Alert variant={chainlinkFunctionTest.status === "success" ? "success" : 
                         chainlinkFunctionTest.status === "warning" ? "warning" : "danger"}>
                    <strong>{chainlinkFunctionTest.message}</strong>
                  </Alert>
                  
                  <h5>Configuration Status:</h5>
                  <ul className="list-group">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Subscription ID
                      {chainlinkFunctionTest.subscriptionStatus === "success" && 
                        <span className="badge bg-success">Valid</span>}
                      {chainlinkFunctionTest.subscriptionStatus === "error" && 
                        <span className="badge bg-danger">Invalid or Not Set</span>}
                      {chainlinkFunctionTest.subscriptionStatus === "unknown" && 
                        <span className="badge bg-secondary">Unknown</span>}
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      DON ID
                      {chainlinkFunctionTest.donStatus === "success" && 
                        <span className="badge bg-success">Valid</span>}
                      {chainlinkFunctionTest.donStatus === "error" && 
                        <span className="badge bg-danger">Invalid or Not Set</span>}
                      {chainlinkFunctionTest.donStatus === "unknown" && 
                        <span className="badge bg-secondary">Unknown</span>}
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Secrets Configuration
                      {chainlinkFunctionTest.secretsStatus === "success" && 
                        <span className="badge bg-success">No Secrets Required</span>}
                      {chainlinkFunctionTest.secretsStatus === "warning" && 
                        <span className="badge bg-warning">Secrets Required</span>}
                      {chainlinkFunctionTest.secretsStatus === "error" && 
                        <span className="badge bg-danger">Error Checking</span>}
                      {chainlinkFunctionTest.secretsStatus === "unknown" && 
                        <span className="badge bg-secondary">Unknown</span>}
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Test Evaluation
                      {chainlinkFunctionTest.testEvaluation === "success" && 
                        <span className="badge bg-success">Passed</span>}
                      {chainlinkFunctionTest.testEvaluation === "error" && 
                        <span className="badge bg-danger">Failed</span>}
                      {chainlinkFunctionTest.testEvaluation === "unavailable" && 
                        <span className="badge bg-warning">Test Function Not Available</span>}
                      {chainlinkFunctionTest.testEvaluation === "unknown" && 
                        <span className="badge bg-secondary">Unknown</span>}
                    </li>
                  </ul>
                  
                  {chainlinkFunctionTest.sourceCode && (
                    <div className="mt-3">
                      <h5>Source Code Preview:</h5>
                      <pre className="bg-light p-3" style={{ maxHeight: '300px', overflow: 'auto' }}>
                        {chainlinkFunctionTest.sourceCode}
                      </pre>
                    </div>
                  )}
                  
                  {chainlinkFunctionTest.status !== "success" && (
                    <div className="mt-3">
                      <h5>Recommendations:</h5>
                      <ul className="list-group">
                        {chainlinkFunctionTest.subscriptionStatus === "error" && (
                          <li className="list-group-item list-group-item-danger">
                            <strong>Invalid Subscription ID:</strong> Set a valid Chainlink Functions subscription ID 
                            in the ChainlinkAnswerVerifier contract.
                          </li>
                        )}
                        {chainlinkFunctionTest.donStatus === "error" && (
                          <li className="list-group-item list-group-item-danger">
                            <strong>Invalid DON ID:</strong> Set a valid Chainlink Functions DON ID 
                            in the ChainlinkAnswerVerifier contract.
                          </li>
                        )}
                        {chainlinkFunctionTest.secretsStatus === "warning" && (
                          <li className="list-group-item list-group-item-warning">
                            <strong>Secrets Required:</strong> Your source code appears to use secrets. 
                            Make sure you've configured encrypted secrets correctly with your Chainlink Functions subscription.
                          </li>
                        )}
                        {chainlinkFunctionTest.testEvaluation === "error" && (
                          <li className="list-group-item list-group-item-danger">
                            <strong>Test Evaluation Failed:</strong> The test evaluation failed. This suggests 
                            there may be issues with your JavaScript source code or LLM integration.
                          </li>
                        )}
                        {chainlinkFunctionTest.testEvaluation === "unavailable" && (
                          <li className="list-group-item list-group-item-warning">
                            <strong>Add Test Function:</strong> Consider adding a test function to your 
                            ChainlinkAnswerVerifier contract to allow for testing the evaluation without submitting transactions.
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="mt-3">
            <Card.Header>Call Trace Simulator</Card.Header>
            <Card.Body>
              <Alert variant="info">
                This tool simulates the entire chain of contract calls that happen during an answer 
                submission, without actually sending a transaction. It helps identify at which exact 
                step the process fails.
              </Alert>
              
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Question Set ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="questionSetId"
                    value={callTraceSimulator.questionSetId}
                    onChange={handleCallTraceInputChange}
                    disabled={callTraceSimulator.isLoading}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Answer Hash</Form.Label>
                  <Form.Control
                    type="text"
                    name="answerHash"
                    value={callTraceSimulator.answerHash}
                    onChange={handleCallTraceInputChange}
                    disabled={callTraceSimulator.isLoading}
                  />
                </Form.Group>
                
                <Button
                  variant="primary"
                  onClick={simulateCallTrace}
                  disabled={callTraceSimulator.isLoading}
                >
                  {callTraceSimulator.isLoading ? 'Simulating...' : 'Simulate Call Trace'}
                </Button>
              </Form>
              
              {callTraceSimulator.error && (
                <Alert variant="danger" className="mt-3">
                  An error occurred during simulation: {callTraceSimulator.error}
                </Alert>
              )}
              
              {callTraceSimulator.result && (
                <div className="mt-3">
                  <h5>Simulation Results:</h5>
                  <Alert 
                    variant={callTraceSimulator.result.success ? "success" : "warning"}
                  >
                    {callTraceSimulator.result.success ? 
                      "All steps completed successfully. The transaction should work." : 
                      "Some steps failed. The transaction will likely revert."}
                  </Alert>
                  
                  <h6>Detailed Trace:</h6>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Step</th>
                        <th>Status</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callTraceSimulator.result.steps.map((step, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{step.step}</td>
                          <td>
                            {step.status === "success" && <Badge bg="success">Success</Badge>}
                            {step.status === "error" && <Badge bg="danger">Failed</Badge>}
                            {step.status === "warning" && <Badge bg="warning">Warning</Badge>}
                            {step.status === "info" && <Badge bg="info">Info</Badge>}
                            {step.status === "running" && <Badge bg="secondary">Running</Badge>}
                          </td>
                          <td style={{ wordBreak: 'break-all' }}>{step.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  
                  <div className="mt-3">
                    <Alert variant="info">
                      <strong>Next Steps:</strong> If the simulation identifies a specific failing step, address that issue first. 
                      If all steps pass but the transaction still fails on-chain, there might be gas-related issues or conditions
                      that only manifest during actual execution (such as state changes during the transaction).
                    </Alert>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="mt-3">
            <Card.Header>Contract Interface Explorer</Card.Header>
            <Card.Body>
              <Alert variant="info">
                This tool inspects the available functions on the contracts to help debug issues
                with missing functions or interface mismatches.
              </Alert>
              
              <Form className="mb-3">
                <Form.Group>
                  <Form.Label>Select Contract</Form.Label>
                  <Form.Select 
                    value={contractInterface.selectedContract}
                    onChange={handleContractSelection}
                    disabled={contractInterface.isLoading}
                  >
                    <option value="questionManager">Question Manager</option>
                    <option value="puzzlePoints">Puzzle Points</option>
                    <option value="verifier">Chainlink Answer Verifier</option>
                  </Form.Select>
                </Form.Group>
                
                <Button
                  variant="primary"
                  className="mt-3"
                  onClick={inspectContractInterface}
                  disabled={contractInterface.isLoading}
                >
                  {contractInterface.isLoading ? 'Loading...' : 'Inspect Contract Interface'}
                </Button>
              </Form>
              
              {contractInterface.error && (
                <Alert variant="danger" className="mt-3">
                  {contractInterface.error}
                </Alert>
              )}
              
              {contractInterface.functions && (
                <div className="mt-3">
                  <h5>{contractInterface.contractName} Contract Interface</h5>
                  <p>Contract address: {contractInterface.contractAddress}</p>
                  
                  <h6>Available Functions ({contractInterface.functions.length}):</h6>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Function Name</th>
                        <th>Type</th>
                        <th>Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractInterface.functions.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center">No functions found</td>
                        </tr>
                      ) : (
                        contractInterface.functions.map((func, index) => (
                          <tr key={index}>
                            <td>{func.name}</td>
                            <td>
                              {func.type === 'view' && <Badge bg="info">View</Badge>}
                              {func.type === 'pure' && <Badge bg="success">Pure</Badge>}
                              {func.type === 'nonpayable' && <Badge bg="warning">Non-payable</Badge>}
                              {func.type === 'payable' && <Badge bg="danger">Payable</Badge>}
                              {func.type === 'unknown' && <Badge bg="secondary">Unknown</Badge>}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{func.signature}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DebugPage; 