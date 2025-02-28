import { Navbar, Container, Nav, Badge } from 'react-bootstrap'
import logo from '../adeptifylogo.png'

const Navigation = ({ account, userRole, tokenBalance }) => {
  return (
    <>
      <Navbar className='my-3' expand="lg" style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}>
        <Container>
          <Navbar.Brand href="/" className="d-flex align-items-center">
            <img 
              src={logo} 
              height="40" 
              className="brand-logo" 
              alt="Logo" 
              style={{ 
                width: 'auto', 
                maxWidth: '200px',
                marginRight: '1rem' 
              }} 
            />
            {userRole === 'admin' && <span className="ms-2 badge" style={{ backgroundColor: 'var(--danger)' }}>Admin</span>}
            {userRole === 'user' && <span className="ms-2 badge" style={{ backgroundColor: 'var(--success)' }}>User</span>}
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {userRole === 'admin' && (
                <>
                  <h2 className="mb-0 nav-link fw-bold" style={{ color: 'var(--neutral-light)' }}>Question Set Management</h2>
                </>
              )}
              
              {userRole === 'user' && (
                <>
                  <Nav.Link href="#dashboard" style={{ color: 'var(--primary)' }}>Dashboard</Nav.Link>
                  <Nav.Link href="#completed" style={{ color: 'var(--neutral-light)' }}>Completed</Nav.Link>
                  <Nav.Link href="#leaderboard" style={{ color: 'var(--neutral-light)' }}>Leaderboard</Nav.Link>
                </>
              )}
            </Nav>
            
            <Nav>
              {account ? (
                <Nav.Item className="d-flex align-items-center">
                  {tokenBalance && (
                    <Badge bg="primary" className="me-2" style={{ backgroundColor: 'var(--secondary)', color: 'var(--neutral-light)' }}>
                      {parseFloat(tokenBalance).toFixed(2)} PZLPT
                    </Badge>
                  )}
                  <div className="account-pill">
                    {account.slice(0, 6) + '...' + account.slice(38, 42)}
                  </div>
                </Nav.Item>
              ) : (
                <Nav.Link className="btn btn-sm btn-outline-primary">
                  Connect Wallet
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  )
}

export default Navigation;
