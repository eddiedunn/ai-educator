import { useEffect, useState, useCallback } from 'react'
import { Container, Alert, Button } from 'react-bootstrap'
import { ethers } from 'ethers'
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3ReactProvider } from '@web3-react/core';
import { metaMask, metaMaskHooks } from '../utils/connectors';

// Components
import Navigation from './Navigation';
import Loading from './Loading';
import AdminPage from '../pages/AdminPage';
import UserPage from '../pages/UserPage';
import AssessmentPage from '../pages/AssessmentPage';

// ABIs: Import your contract ABIs here
import PuzzlePointsArtifact from '../abis/contracts/PuzzlePoints.sol/PuzzlePoints.json';
import QuestionManagerArtifact from '../abis/contracts/QuestionManager.sol/QuestionManager.json';

// Import the contract addresses and config from our config file
import { CONTRACT_ADDRESSES } from '../config';

// Contract addresses from config file, which gets updated by the update-config.js script
const PUZZLE_POINTS_ADDRESS = CONTRACT_ADDRESSES.puzzlePoints;
const QUESTION_MANAGER_ADDRESS = CONTRACT_ADDRESSES.questionManager;

function App() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState(null) // 'admin', 'user', or null
  const [puzzlePoints, setPuzzlePoints] = useState(null)
  const [questionManager, setQuestionManager] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Force reset MetaMask connection
  const handleForceReconnect = async () => {
    try {
      // Clear any local storage data
      localStorage.removeItem('questionSets');

      // Request permissions
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (err) {
        console.warn("Permission request failed, trying reload:", err);
      }
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error("Error resetting MetaMask connection:", error);
      window.location.reload();
    }
  };
  
  const loadBlockchainData = useCallback(async () => {
    // Prevent infinite loading if we've tried too many times
    if (reconnectAttempts > 3) {
      setIsLoading(false);
      setErrorMessage("Failed to connect after multiple attempts. Please check your network connection.");
      return;
    }
    
    try {
      setErrorMessage(null);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setIsLoading(false);
        setErrorMessage("MetaMask not detected. Please install MetaMask extension.");
        return;
      }
      
      // Initiate provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Check if the user has already connected their wallet
      let account = null;
      try {
        // First try to get accounts without prompting
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts'  // This doesn't prompt, just returns connected accounts
        });
        
        if (accounts && accounts.length > 0) {
          account = ethers.utils.getAddress(accounts[0]);
          setAccount(account);
          
          // Fetch ETH balance
          const balance = ethers.utils.formatUnits(
            await provider.getBalance(account), 
            18
          );
          setBalance(balance);
        } else {
          // No accounts connected yet - exit gracefully without error
          console.log("No accounts connected yet - waiting for user to connect");
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
        setErrorMessage("Failed to check wallet connection: " + error.message);
        setIsLoading(false);
        return;
      }

      // If we have no account by this point, exit gracefully 
      if (!account) {
        setIsLoading(false);
        return;
      }

      const signer = provider.getSigner();
      
      // Load contract instances
      let puzzlePointsContract;
      let questionManagerContract;
      
      try {
        // PuzzlePoints contract
        puzzlePointsContract = new ethers.Contract(
          PUZZLE_POINTS_ADDRESS,
          PuzzlePointsArtifact.abi,
          signer
        );
        setPuzzlePoints(puzzlePointsContract);
        
        // Try to fetch token balance
        try {
          if (account) { // Only try to fetch balance if account exists
            const tokenBal = await puzzlePointsContract.balanceOf(account);
            setTokenBalance(ethers.utils.formatUnits(tokenBal, 18));
          } else {
            console.log("No account available, skipping token balance fetch");
            setTokenBalance(0);
          }
        } catch (error) {
          console.error("Error fetching token balance:", error);
          // Default to zero balance on error
          setTokenBalance(0);
        }
        
        // QuestionManager contract
        questionManagerContract = new ethers.Contract(
          QUESTION_MANAGER_ADDRESS,
          QuestionManagerArtifact.abi,
          signer
        );
        setQuestionManager(questionManagerContract);
      } catch (error) {
        console.error("Error loading contracts:", error);
        // Handle other contract errors
        setErrorMessage("Error loading contracts: " + error.message);
        setIsLoading(false);
        return;
      }

      // Set user role based on connected address
      try {
        // Check if connected wallet is the owner of the QuestionManager contract
        const owner = await questionManagerContract.owner();
        const lowerCaseAccount = account.toLowerCase();
        const lowerCaseOwner = owner.toLowerCase();
        
        console.log(`Connected account: ${lowerCaseAccount}`);
        console.log(`Contract owner: ${lowerCaseOwner}`);
        
        if (lowerCaseAccount === lowerCaseOwner) {
          setUserRole('admin');
          console.log('Connected as admin (contract owner)');
        } else {
          // Any non-owner address is considered a user
          setUserRole('user');
          console.log('Connected as regular user');
        }
      } catch (error) {
        console.error("Error checking contract ownership:", error);
        // Default to user role if we can't determine ownership
        setUserRole('user');
      }

      // Reset reconnect counter on success
      setReconnectAttempts(0);
      setIsLoading(false);
      
    } catch (error) {
      console.error("General error loading blockchain data:", error);
      setErrorMessage(`Error connecting to blockchain: ${error.message}`);
      // Increment reconnect attempts counter
      setReconnectAttempts(prev => prev + 1);
      setIsLoading(false);
    }
  }, [reconnectAttempts]);

  // Load blockchain data when isLoading is true
  useEffect(() => {
    if (isLoading) {
      loadBlockchainData();
    }
  }, [isLoading, loadBlockchainData]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = () => {
        console.log("MetaMask accounts changed detected!");
        // Clear cached data related to the previous account
        setPuzzlePoints(null);
        setQuestionManager(null);
        setUserRole(null);
        setBalance(0);
        setTokenBalance(0);
        // Force a full reload to ensure we get fresh data
        setIsLoading(true);
      };
      
      const handleChainChanged = () => {
        // Chain changed, reload the application
        setIsLoading(true);
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const renderContent = () => {
    if (errorMessage) {
      return (
        <Container className="mt-5">
          <Alert variant="danger" style={{ borderRadius: '10px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Alert.Heading>Error</Alert.Heading>
            <p>{errorMessage}</p>
            <hr />
            <div className="d-flex flex-column gap-2">
              <div className="d-flex justify-content-between">
                <Button variant="outline-primary" onClick={handleForceReconnect}>
                  Reconnect to MetaMask
                </Button>
              </div>
            </div>
          </Alert>
        </Container>
      );
    }

    if (!account) {
      return (
        <div className="container mt-5">
          <div className="text-center p-5" style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }}>
            <h4 style={{ color: 'var(--neutral-light)', marginBottom: '20px' }}>Please connect your wallet to continue</h4>
            <Button 
              variant="primary" 
              onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
              style={{ borderRadius: '25px', paddingLeft: '25px', paddingRight: '25px' }}
            >
              Connect MetaMask
            </Button>
          </div>
        </div>
      );
    }

    switch(userRole) {
      case 'admin':
        return (
          <AdminPage 
            account={account} 
            tokenBalance={tokenBalance} 
            puzzlePoints={puzzlePoints} 
            questionManager={questionManager} 
          />
        );
      case 'user':
        return (
          <UserPage 
            account={account} 
            balance={balance} 
            tokenBalance={tokenBalance} 
            puzzlePoints={puzzlePoints} 
            questionManager={questionManager}
          />
        );
      default:
        // Default case - should rarely happen, but just in case
        return (
          <div className="text-center mt-4" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <p style={{ color: 'var(--neutral-light)' }}>Loading your account information...</p>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleForceReconnect}
              className="mt-2"
              style={{ borderRadius: '20px' }}
            >
              Change Wallet
            </Button>
          </div>
        );
    }
  };

  return(
    <Container>
      <Navigation account={account} userRole={userRole} tokenBalance={tokenBalance} />

      {!account && (
        <Button 
          variant="primary" 
          onClick={() => {
            if (window.ethereum) {
              window.ethereum.request({ method: 'eth_requestAccounts' })
                .then(() => setIsLoading(true))
                .catch(err => setErrorMessage("Failed to connect: " + err.message));
            } else {
              setErrorMessage("MetaMask not detected. Please install MetaMask extension.");
            }
          }}
          className="d-block mx-auto my-4"
          style={{ borderRadius: '25px', paddingLeft: '25px', paddingRight: '25px' }}
        >
          Connect Wallet
        </Button>
      )}

      {isLoading ? (
        <div className="d-flex flex-column align-items-center mt-5">
          <Loading />
        </div>
      ) : (
        <Routes>
          <Route path="/" element={renderContent()} />
          <Route 
            path="/assessment/:id" 
            element={
              userRole === 'user' ? (
                <AssessmentPage 
                  questionManager={questionManager} 
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
      )}
    </Container>
  );
}

// Wrap the App component export with Web3ReactProvider
export default function AppWithProvider() {
  return (
    <Web3ReactProvider connectors={[[metaMask, metaMaskHooks]]}>
      <App />
    </Web3ReactProvider>
  );
}
