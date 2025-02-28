import { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import { ethers } from 'ethers'

// Components
import Navigation from './Navigation';
import Loading from './Loading';
import AdminPage from '../pages/AdminPage';
import UserPage from '../pages/UserPage';

// ABIs: Import your contract ABIs here
import PuzzlePointsArtifact from '../abis/contracts/PuzzlePoints.sol/PuzzlePoints.json';

// Config: Import your network config here
// import config from '../config.json';

// Wallet addresses
const ADMIN_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const USER_ADDRESS = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

// Contract addresses - update these after deployment
// These should ideally come from a config file or environment variables
const PUZZLE_POINTS_ADDRESS = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853'; // Deployed PuzzlePoints address

function App() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState(null) // 'admin', 'user', or null
  const [puzzlePoints, setPuzzlePoints] = useState(null)

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()

    // Fetch accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    const account = ethers.utils.getAddress(accounts[0])
    setAccount(account)

    // Fetch ETH balance
    let balance = await provider.getBalance(account)
    balance = ethers.utils.formatUnits(balance, 18)
    setBalance(balance)

    // Load PuzzlePoints contract
    try {
      const puzzlePointsContract = new ethers.Contract(
        PUZZLE_POINTS_ADDRESS,
        PuzzlePointsArtifact.abi,
        signer
      )
      setPuzzlePoints(puzzlePointsContract)

      // Fetch PuzzlePoints balance
      const tokenBalance = await puzzlePointsContract.balanceOf(account)
      setTokenBalance(ethers.utils.formatUnits(tokenBalance, 18))
    } catch (error) {
      console.error("Error loading PuzzlePoints contract:", error)
    }

    // Check user role based on address
    const lowerCaseAccount = account.toLowerCase()
    if (lowerCaseAccount === ADMIN_ADDRESS.toLowerCase()) {
      setUserRole('admin')
    } else if (lowerCaseAccount === USER_ADDRESS.toLowerCase()) {
      setUserRole('user')
    } else {
      setUserRole(null)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData()
    }
  }, [isLoading]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        setIsLoading(true)
      })
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {
          setIsLoading(true)
        })
      }
    }
  }, [])

  const renderContent = () => {
    if (!account) {
      return (
        <div className="text-center mt-5">
          <h3>Please connect your wallet to continue</h3>
        </div>
      )
    }

    switch(userRole) {
      case 'admin':
        return <AdminPage account={account} tokenBalance={tokenBalance} puzzlePoints={puzzlePoints} />
      case 'user':
        return <UserPage account={account} balance={balance} tokenBalance={tokenBalance} puzzlePoints={puzzlePoints} />
      default:
        return (
          <div className="text-center mt-5">
            <h3>Unauthorized Wallet</h3>
            <p>Connect with an authorized wallet address to access the application</p>
            <p><strong>Current address:</strong> {account}</p>
            <p>For testing, connect with one of these addresses:</p>
            <ul className="list-unstyled">
              <li>Admin: {ADMIN_ADDRESS}</li>
              <li>User: {USER_ADDRESS}</li>
            </ul>
          </div>
        )
    }
  }

  return(
    <Container>
      <Navigation account={account} userRole={userRole} tokenBalance={tokenBalance} />

      {isLoading ? (
        <Loading />
      ) : (
        renderContent()
      )}
    </Container>
  )
}

export default App;
