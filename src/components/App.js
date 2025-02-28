import { useEffect, useState } from 'react'
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
import { CONTRACT_ADDRESSES, TEST_ACCOUNTS } from '../config';

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
  const [needsReset, setNeedsReset] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Reset all application state
  const handleReset = () => {
    // Clear ALL local storage data related to blockchain
    clearBlockchainStorage();
    
    // Reset all state variables
    setIsLoading(false); // Set to false first to break any loading loops
    setTimeout(() => {
      setAccount(null);
      setBalance(0);
      setTokenBalance(0);
      setPuzzlePoints(null);
      setQuestionManager(null);
      setUserRole(null);
      setErrorMessage(null);
      setNeedsReset(false);
      setReconnectAttempts(0);
      
      // Now start loading again
      setIsLoading(true);
    }, 100);
  };

  // Force reset MetaMask connection
  const handleForceReconnect = async () => {
    try {
      // Clear ALL local storage data
      clearBlockchainStorage();

      // Method 1: Request permissions - most gentle approach
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (err) {
        console.warn("Permission request failed, trying reload:", err);
      }
      
      // Reload the page regardless of whether the permission request succeeded
      window.location.reload();
    } catch (error) {
      console.error("Error resetting MetaMask connection:", error);
      window.location.reload();
    }
  };

  // Clear all blockchain-related data from localStorage
  const clearBlockchainStorage = () => {
    console.log("Clearing all blockchain storage data");
    // Remove specific keys we know about
    localStorage.removeItem('lastKnownBlockNumber');
    localStorage.removeItem('lastKnownNetwork');
    
    // Clear any questionSet data
    localStorage.removeItem('questionSets');
    
    console.log("Storage cleared");
  };
  
  // Reset application for new network
  const resetForNewNetwork = () => {
    console.log("Resetting application for new network");
    clearBlockchainStorage();
    
    // Get current network if possible
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        provider.getNetwork().then(network => {
          console.log(`Resetting for network: ${network.name} (${network.chainId})`);
          localStorage.setItem('lastKnownNetwork', network.chainId.toString());
        }).catch(console.error);
      }
    } catch (err) {
      console.error("Could not determine current network during reset:", err);
    }
    
    // Reset the application
    setIsLoading(true);
    setNeedsReset(false);
    setErrorMessage(null);
  };
  
  const loadBlockchainData = async () => {
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
      
      // Check if blockchain has been reset by comparing block numbers
      try {
        const currentBlock = await provider.getBlockNumber();
        const lastKnownBlock = localStorage.getItem('lastKnownBlockNumber');
        const currentNetwork = await provider.getNetwork();
        const lastKnownNetwork = localStorage.getItem('lastKnownNetwork');
        
        console.log(`Current block: ${currentBlock}, Last known block: ${lastKnownBlock || 'none'}`);
        console.log(`Current network: ${currentNetwork.chainId}, Last known network: ${lastKnownNetwork || 'none'}`);
        
        // Store current network ID
        localStorage.setItem('lastKnownNetwork', currentNetwork.chainId.toString());
        
        // Only check for blockchain reset if we're on the same network as before
        if (lastKnownBlock && lastKnownNetwork && lastKnownNetwork === currentNetwork.chainId.toString()) {
          const lastBlock = parseInt(lastKnownBlock);
          // If last known block is higher OR if it's drastically lower (indicating complete reset)
          if (lastBlock > currentBlock || (lastBlock + 10 < currentBlock)) {
            console.warn(`Blockchain reset detected! Last known block: ${lastKnownBlock}, Current block: ${currentBlock}`);
            localStorage.setItem('lastKnownBlockNumber', currentBlock.toString());
            setNeedsReset(true);
            setIsLoading(false);
            return;
          } else {
            localStorage.setItem('lastKnownBlockNumber', currentBlock.toString());
          }
        } else {
          // First time loading or different network, store current block number
          localStorage.setItem('lastKnownBlockNumber', currentBlock.toString());
        }
      } catch (error) {
        console.error("Error checking blockchain state:", error);
        // Continue anyway, might be first load
      }

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
      try {
        // PuzzlePoints contract
        const puzzlePointsContract = new ethers.Contract(
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
          
          // Check specific error patterns for blockchain reset
          const errorString = error.toString().toLowerCase();
          if (
            errorString.includes("invalid block tag") || 
            (error.data && error.data.message && error.data.message.includes("invalid block tag"))
          ) {
            console.warn("Detected invalid block tag error - may be due to network change or blockchain reset");
            // Don't automatically set needsReset, just retry loading
            setIsLoading(true);
            return;
          }
          
          // Default to zero balance on error
          setTokenBalance(0);
        }
        
        // QuestionManager contract
        const questionManagerContract = new ethers.Contract(
          QUESTION_MANAGER_ADDRESS,
          QuestionManagerArtifact.abi,
          signer
        );
        setQuestionManager(questionManagerContract);
      } catch (error) {
        console.error("Error loading contracts:", error);
        
        // Check for blockchain reset error patterns
        if (error.toString().toLowerCase().includes("invalid block tag") || 
            (error.data && error.data.message && error.data.message.includes("invalid block tag"))) {
          console.warn("Detected invalid block tag error - may be due to network change or blockchain reset");
          // Don't automatically set needsReset, just retry loading
          setIsLoading(true);
          return;
        }
        
        // Handle other contract errors
        setErrorMessage("Error loading contracts: " + error.message);
        setIsLoading(false);
        return;
      }

      // Set user role based on connected address
      try {
        // Check if connected wallet is the owner of the QuestionManager contract
        const owner = await questionManager.owner();
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
      
      // Check for blockchain reset signature in the error
      if (error.toString().includes("invalid block tag") || 
          (error.data && error.data.message && error.data.message.includes("invalid block tag"))) {
        console.warn("Detected invalid block tag error - may be due to network change or blockchain reset");
        // Try to determine if this is a network change or a true reset
        try {
          const currentNetwork = await (new ethers.providers.Web3Provider(window.ethereum)).getNetwork();
          const lastKnownNetwork = localStorage.getItem('lastKnownNetwork');
          
          // If on a different network than last time, don't trigger reset dialog
          if (lastKnownNetwork && currentNetwork.chainId.toString() !== lastKnownNetwork) {
            console.log(`Network changed from ${lastKnownNetwork} to ${currentNetwork.chainId}`);
            localStorage.setItem('lastKnownNetwork', currentNetwork.chainId.toString());
            localStorage.setItem('lastKnownBlockNumber', '0'); // Reset block number for new network
            setIsLoading(true); // Just retry loading
            return;
          } else {
            // Same network but block tag error, likely a true reset
            setNeedsReset(true);
          }
        } catch (netError) {
          console.error("Error checking network during error recovery:", netError);
          setNeedsReset(true); // Default to showing reset dialog if we can't determine
        }
      } else {
        setErrorMessage(`Error connecting to blockchain: ${error.message}`);
        // Increment reconnect attempts counter
        setReconnectAttempts(prev => prev + 1);
      }
      
      setIsLoading(false);
    }
  };

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
        // Chain changed, reset the application state
        localStorage.removeItem('lastKnownBlockNumber');
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
    if (needsReset) {
      return (
        <div className="text-center mt-5">
          <Alert variant="warning">
            <Alert.Heading>Blockchain State Mismatch Detected</Alert.Heading>
            <p>The application has detected a potential mismatch between expected blockchain state and current state.</p>
            <p>This typically happens when connecting to a new network or if the network has been reset.</p>
            <div className="d-flex flex-column gap-2 mt-3">
              <Button variant="primary" onClick={handleReset}>
                Reset Application State
              </Button>
              <Button variant="secondary" onClick={resetForNewNetwork}>
                Reset For Network Change
              </Button>
              <Button variant="secondary" onClick={handleForceReconnect}>
                Reset MetaMask Connection
              </Button>
            </div>
          </Alert>
          <div className="mt-4">
            <h5>Troubleshooting Tips:</h5>
            <div className="text-start">
              <p><strong>For Base Sepolia or other testnets:</strong></p>
              <ol>
                <li>Ensure you have the right contract addresses in your configuration</li>
                <li>Verify you're connected to the correct network (Chain ID 84532 for Base Sepolia)</li>
                <li>Check that your wallet has sufficient funds for transactions</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }
    
    if (errorMessage) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Error</Alert.Heading>
            <p>{errorMessage}</p>
            <hr />
            <div className="d-flex flex-column gap-2">
              <div className="d-flex justify-content-between">
                <Button variant="outline-danger" onClick={handleReset}>
                  Reset Application State
                </Button>
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
          <Alert variant="warning">
            <Alert.Heading>Wallet Connection Required</Alert.Heading>
            <p>
              Please connect your MetaMask wallet to use this application.
            </p>
            <hr />
            <div className="d-flex flex-column gap-2">
              <Button 
                variant="primary" 
                onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
              >
                Connect MetaMask
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    switch(userRole) {
      case 'admin':
        return (
          <>
            <div className="alert alert-warning mb-3">
              <strong>You are connected as the admin (contract owner).</strong> To test as a regular user, please switch to a different account in MetaMask.
              <button className="btn btn-sm btn-outline-dark ms-2" onClick={handleForceReconnect}>
                Switch Account
              </button>
            </div>
            <AdminPage 
              account={account} 
              tokenBalance={tokenBalance} 
              puzzlePoints={puzzlePoints} 
              questionManager={questionManager} 
            />
          </>
        );
      case 'user':
        return (
          <>
            <div className="alert alert-success mb-3">
              <strong>You are connected as a regular user.</strong> This account can take assessments but cannot create or manage question sets.
            </div>
            <UserPage 
              account={account} 
              balance={balance} 
              tokenBalance={tokenBalance} 
              puzzlePoints={puzzlePoints} 
              questionManager={questionManager}
            />
          </>
        );
      default:
        return (
          <div className="text-center mt-5">
            <Alert variant="info">
              <Alert.Heading>Connected as User</Alert.Heading>
              <p>Your wallet is connected as a regular user.</p>
              <p><strong>Current address:</strong> {account}</p>
              <p>To access admin features, please connect with the admin wallet address.</p>
              <Button 
                variant="outline-primary" 
                onClick={handleForceReconnect}
              >
                Change Wallet
              </Button>
            </Alert>
          </div>
        );
    }
  };

  return(
    <Container>
      <Navigation account={account} userRole={userRole} tokenBalance={tokenBalance} />

      {!account && (
        <Alert variant="primary" className="mt-4">
          <Alert.Heading>Connect Your Wallet</Alert.Heading>
          <p>Please connect your wallet to use the dApp.</p>
          <div className="d-grid gap-2 mb-3">
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
            >
              Connect Wallet
            </Button>
          </div>
        </Alert>
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
