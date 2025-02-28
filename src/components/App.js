import { useEffect, useState } from 'react'
import { Container, Button, Row, Col } from 'react-bootstrap'
import { ethers } from 'ethers'

// Components
import Navigation from './Navigation';
import Loading from './Loading';
import AdminPage from '../pages/AdminPage';
import UserPage from '../pages/UserPage';

// ABIs: Import your contract ABIs here
// import TOKEN_ABI from '../abis/Token.json'

// Config: Import your network config here
// import config from '../config.json';

function App() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('home') // 'home', 'admin', or 'user'
  const [isAdmin, setIsAdmin] = useState(false)

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = new ethers.providers.Web3Provider(window.ethereum)

    // Fetch accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    const account = ethers.utils.getAddress(accounts[0])
    setAccount(account)

    // Fetch account balance
    let balance = await provider.getBalance(account)
    balance = ethers.utils.formatUnits(balance, 18)
    setBalance(balance)

    // TODO: Check if account is admin in your smart contract
    // For now, we'll simulate this with a hardcoded check
    // In production, you would check a role in your smart contract
    setIsAdmin(account.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'.toLowerCase())

    setIsLoading(false)
  }

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData()
    }
  }, [isLoading]);

  const renderContent = () => {
    switch(view) {
      case 'admin':
        return <AdminPage account={account} />
      case 'user':
        return <UserPage account={account} balance={balance} />
      default:
        return (
          <>
            <h1 className='my-4 text-center'>React Hardhat Template</h1>
            <p className='text-center'><strong>Your ETH Balance:</strong> {balance} ETH</p>
            
            <Row className="mt-4 justify-content-center">
              <Col md={6} className="d-grid gap-2">
                {isAdmin && (
                  <Button 
                    variant="danger" 
                    size="lg" 
                    onClick={() => setView('admin')}
                    className="mb-3"
                  >
                    Admin Dashboard
                  </Button>
                )}
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={() => setView('user')}
                >
                  User Dashboard
                </Button>
              </Col>
            </Row>
          </>
        )
    }
  }

  return(
    <Container>
      <Navigation account={account} />

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {view !== 'home' && (
            <Button 
              variant="secondary" 
              className="mt-3"
              onClick={() => setView('home')}
            >
              ← Back to Home
            </Button>
          )}
          {renderContent()}
        </>
      )}
    </Container>
  )
}

export default App;
