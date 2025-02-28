import { useEffect, useState } from 'react'
import { Container, Alert, Button, Spinner } from 'react-bootstrap'
import { ethers } from 'ethers'
import { Routes, Route, Navigate } from 'react-router-dom';

// Components
import Navigation from './Navigation';
import Loading from './Loading';
import AdminPage from '../pages/AdminPage';
import UserPage from '../pages/UserPage';
import AssessmentPage from '../pages/AssessmentPage';

// ABIs: Import your contract ABIs here
import PuzzlePointsArtifact from '../abis/contracts/PuzzlePoints.sol/PuzzlePoints.json';
import QuestionManagerArtifact from '../abis/contracts/QuestionManager.sol/QuestionManager.json';

// Config: Import your network config here
// import config from '../config.json';

// Wallet addresses
const ADMIN_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const USER_ADDRESS = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

// Contract addresses - update these after deployment
// These should ideally come from a config file or environment variables
const PUZZLE_POINTS_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Deployed PuzzlePoints address
const QUESTION_MANAGER_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'; // Deployed QuestionManager address

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
  const [nodeIsRunning, setNodeIsRunning] = useState(true)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [statusMessage, setStatusMessage] = useState(null)

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
      setNodeIsRunning(true);
      
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
    
    // Clear any questionSet data
    localStorage.removeItem('questionSets');
    
    // Optionally, clear all localStorage if you want a complete reset
    // localStorage.clear();
    
    console.log("Storage cleared");
  };
  
  const checkNodeConnection = async () => {
    try {
      // Try to connect to the Hardhat node
      const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      await provider.getBlockNumber();
      setNodeIsRunning(true);
      return true;
    } catch (error) {
      console.error("Error connecting to Hardhat node:", error);
      setNodeIsRunning(false);
      return false;
    }
  };
  
  const loadBlockchainData = async () => {
    // Prevent infinite loading if we've tried too many times
    if (reconnectAttempts > 3) {
      setIsLoading(false);
      setErrorMessage("Failed to connect after multiple attempts. Please check if your blockchain node is running.");
      return;
    }
    
    try {
      setErrorMessage(null);
      
      // First check if the node is running
      const nodeRunning = await checkNodeConnection();
      if (!nodeRunning) {
        setIsLoading(false);
        setErrorMessage("Cannot connect to local blockchain node. Please make sure Hardhat is running.");
        return;
      }
      
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
        
        console.log(`Current block: ${currentBlock}, Last known block: ${lastKnownBlock || 'none'}`);
        
        // More aggressively detect resets - if we have a last known block
        // but it's significantly different from current, consider it a reset
        if (lastKnownBlock) {
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
          // First time loading, no previous block number
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
            console.warn("Detected invalid block tag error - blockchain likely reset");
            setNeedsReset(true);
            setIsLoading(false);
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
          setNeedsReset(true);
          setIsLoading(false);
          return;
        }
        
        // Handle other contract errors
        setErrorMessage("Error loading contracts: " + error.message);
        setIsLoading(false);
        return;
      }

      // Set user role based on connected address
      const lowerCaseAccount = account.toLowerCase();
      if (lowerCaseAccount === ADMIN_ADDRESS.toLowerCase()) {
        setUserRole('admin');
      } else if (lowerCaseAccount === USER_ADDRESS.toLowerCase()) {
        setUserRole('user');
      } else {
        setUserRole(null);
      }

      // Reset reconnect counter on success
      setReconnectAttempts(0);
      setIsLoading(false);
      
    } catch (error) {
      console.error("General error loading blockchain data:", error);
      
      // Check for blockchain reset signature in the error
      if (error.toString().includes("invalid block tag") || 
          (error.data && error.data.message && error.data.message.includes("invalid block tag"))) {
        setNeedsReset(true);
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
  }, [isLoading]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = () => {
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

  const handleConnectToHardhat = async () => {
    try {
      setStatusMessage('Attempting to connect to Hardhat network...');
      
      // Try to switch to the Hardhat network first
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337 in hex
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x7A69', // 31337 in hex
                chainName: 'Hardhat Local',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['http://127.0.0.1:8545/'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
      
      // After ensuring the network is correct, request access to accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        // Successfully connected
        setStatusMessage(null);
        loadBlockchainData();
      }
    } catch (error) {
      console.error('Error connecting to Hardhat:', error);
      setStatusMessage(`Failed to connect to Hardhat: ${error.message}`);
    }
  };

  // Add function to help import Hardhat account to MetaMask
  const handleImportHardhatAccount = async () => {
    try {
      setStatusMessage('Importing Hardhat test account to MetaMask...');
      
      // The first Hardhat test account private key
      const firstAccountPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      
      // Import account to MetaMask
      await window.ethereum.request({
        method: 'wallet_importRawKey',
        params: [
          firstAccountPrivateKey.replace('0x', ''), // Remove 0x prefix if present
          'hardhat-test' // Password (can be anything)
        ]
      }).then(async (newAddress) => {
        console.log('Successfully imported account:', newAddress);
        
        // Switch to the imported account
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337 in hex
        });
        
        // Request account access again to use the newly imported account
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        setStatusMessage('Successfully imported Hardhat test account!');
        loadBlockchainData();
      });
    } catch (error) {
      console.error('Error importing Hardhat account:', error);
      setStatusMessage(`Failed to import account: ${error.message}. You may need to import manually.`);
    }
  };

  const renderContent = () => {
    if (!nodeIsRunning) {
      return (
        <div className="text-center mt-5">
          <Alert variant="danger">
            <Alert.Heading>Blockchain Node Not Running</Alert.Heading>
            <p>Cannot connect to the local Hardhat node. Please make sure it's running using:</p>
            <pre className="bg-dark text-light p-3 mt-3">npm run chain</pre>
            <p className="mt-3">Then click the button below to try again:</p>
            <Button variant="primary" onClick={handleReset}>
              Retry Connection
            </Button>
          </Alert>
        </div>
      );
    }
    
    if (needsReset) {
      return (
        <div className="text-center mt-5">
          <Alert variant="warning">
            <Alert.Heading>Blockchain State Mismatch Detected</Alert.Heading>
            <p>It appears that the local blockchain has been reset since you last used the application.</p>
            <p>This typically happens when the Hardhat node is restarted.</p>
            <div className="d-flex flex-column gap-2 mt-3">
              <Button variant="primary" onClick={handleReset}>
                Reset Application State
              </Button>
              <Button variant="secondary" onClick={handleForceReconnect}>
                Reset MetaMask Connection
              </Button>
              <Button 
                variant="outline-danger" 
                onClick={() => {
                  clearBlockchainStorage();
                  window.location.reload();
                }}
              >
                Hard Reset (Clear All Data)
              </Button>
            </div>
          </Alert>
          <div className="mt-4">
            <h5>If you continue to see this message:</h5>
            <ol className="text-start">
              <li>Ensure you are running the latest blockchain by using <code>npm run restart:chain</code></li>
              <li>Deploy the contracts again with <code>npm run deploy:full</code></li>
              <li>Reset your MetaMask: Settings &gt; Advanced &gt; Reset Account</li>
              <li>Check that the contract addresses in App.js match your deployed contracts</li>
            </ol>
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
              
              <Button 
                variant="danger"
                className="mt-2"
                onClick={() => {
                  if (window.confirm("⚠️ This will perform a full reset of your dApp. You should restart your local blockchain node after this. Continue?")) {
                    // Clear EVERYTHING from localStorage
                    localStorage.clear();
                    
                    // Force disconnect from MetaMask
                    if (window.ethereum) {
                      try {
                        window.ethereum.request({
                          method: 'wallet_revokePermissions',
                          params: [{ eth_accounts: {} }]
                        }).catch(console.warn);
                      } catch (e) {
                        console.warn("Could not revoke permissions:", e);
                      }
                    }
                    
                    // Display instructions before reload
                    alert("After the page reloads:\n1. Stop your Hardhat node\n2. Run 'npx hardhat node' to restart it\n3. Run 'npm run deploy:full' in a new terminal\n4. Connect MetaMask to the admin account");
                    
                    // Reload the page
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  }
                }}
              >
                Emergency Full Reset
              </Button>
              
              <div className="mt-3">
                <strong>Troubleshooting Instructions:</strong>
                <ol className="mt-2 mb-0 small">
                  <li>Restart your local blockchain node with: <code>npx hardhat node</code></li>
                  <li>Redeploy contracts with: <code>npm run deploy:full</code></li>
                  <li>Reset MetaMask by going to Settings → Advanced → Reset Account</li>
                  <li>Make sure you're using the admin account: <code>0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266</code></li>
                </ol>
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
              If you're using the local Hardhat development network, you'll need to:
            </p>
            <ol>
              <li>Make sure MetaMask is installed and unlocked</li>
              <li>Connect to the Hardhat network (Chain ID: 31337, RPC URL: http://127.0.0.1:8545)</li>
              <li>Import a test account using one of the private keys from the Hardhat node</li>
            </ol>
            <hr />
            <div className="d-flex flex-column gap-2">
              <Button 
                variant="primary" 
                onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
              >
                Connect MetaMask
              </Button>
              <Button 
                variant="info" 
                onClick={handleConnectToHardhat}
              >
                Connect to Hardhat Network
              </Button>
              <Button 
                variant="success" 
                onClick={handleImportHardhatAccount}
              >
                Import Test Account (Admin)
              </Button>
            </div>
            <p className="mt-3 text-muted">
              <small>
                <strong>Note:</strong> If you're using the local Hardhat network for development, you can use these test accounts:
                <br />
                Admin account: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
                <br />
                User account: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8
              </small>
            </p>
          </Alert>
        </div>
      );
    }

    switch(userRole) {
      case 'admin':
        return <AdminPage 
          account={account} 
          tokenBalance={tokenBalance} 
          puzzlePoints={puzzlePoints} 
          questionManager={questionManager} 
        />;
      case 'user':
        return <UserPage 
          account={account} 
          balance={balance} 
          tokenBalance={tokenBalance} 
          puzzlePoints={puzzlePoints} 
          questionManager={questionManager}
        />;
      default:
        return (
          <div className="text-center mt-5">
            <Alert variant="info">
              <Alert.Heading>Unauthorized Wallet</Alert.Heading>
              <p>Connect with an authorized wallet address to access the application</p>
              <p><strong>Current address:</strong> {account}</p>
              <p>For testing, connect with one of these addresses:</p>
              <ul className="list-unstyled">
                <li>Admin: {ADMIN_ADDRESS}</li>
                <li>User: {USER_ADDRESS}</li>
              </ul>
            </Alert>
          </div>
        );
    }
  };

  return(
    <Container>
      <Navigation account={account} userRole={userRole} tokenBalance={tokenBalance} />

      {!account && !isLoading && (
        <Alert variant="info" className="mt-3">
          <Alert.Heading>Connect Your Wallet</Alert.Heading>
          <p>You need to connect MetaMask to use this application.</p>
          <div className="d-flex gap-2">
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
              Connect MetaMask
            </Button>
            <Button 
              variant="outline-primary" 
              onClick={handleConnectToHardhat}
            >
              Connect to Hardhat
            </Button>
            <Button 
              variant="success" 
              onClick={handleImportHardhatAccount}
            >
              Import Admin Account
            </Button>
          </div>
          <div className="mt-3 small text-muted">
            <p>To connect to the Hardhat network manually:</p>
            <ol className="text-start mb-0">
              <li>Open MetaMask</li>
              <li>Add a new network with RPC URL: http://127.0.0.1:8545</li>
              <li>Chain ID: 31337</li>
              <li>Currency Symbol: ETH</li>
            </ol>
          </div>
        </Alert>
      )}

      {isLoading ? (
        <div className="d-flex flex-column align-items-center mt-5">
          <Loading />
          {statusMessage && (
            <div className="mt-3 text-primary text-center">{statusMessage}</div>
          )}
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

export default App;
