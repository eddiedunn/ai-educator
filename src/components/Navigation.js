import React from 'react';
import { Navbar, Nav, Badge, Button } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'
import logo from '../adeptifylogo.png'

const Navigation = ({ account, userRole, tokenBalance }) => {
  console.log("Current user role:", userRole); // Debug to check role value

  return (
    <Navbar className='my-3' expand="lg" style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}>
      <div className="container">
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center">
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
        </LinkContainer>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {userRole === 'admin' && (
              <>
                <LinkContainer to="/">
                  <Nav.Link style={{ color: 'var(--primary)' }}>Question Sets</Nav.Link>
                </LinkContainer>
                
                <LinkContainer to="/chainlink-admin">
                  <Nav.Link style={{ color: 'var(--primary)' }}>Chainlink Admin</Nav.Link>
                </LinkContainer>
                
                <LinkContainer to="/leaderboard">
                  <Nav.Link style={{ color: 'var(--primary)' }}>Leaderboard</Nav.Link>
                </LinkContainer>
              </>
            )}

            {userRole === 'user' && (
              <>
                <LinkContainer to="/">
                  <Nav.Link style={{ color: 'var(--primary)' }}>Dashboard</Nav.Link>
                </LinkContainer>
                <Nav.Link href="#completed" style={{ color: 'var(--neutral-light)' }}>Completed</Nav.Link>
                <LinkContainer to="/leaderboard">
                  <Nav.Link style={{ color: 'var(--neutral-light)' }}>Leaderboard</Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>

          <Nav>
            {account ? (
              <Nav.Item className="d-flex align-items-center">
                {tokenBalance && (
                  <Badge bg="primary" className="me-2" style={{ backgroundColor: 'var(--secondary)', color: 'var(--neutral-light)' }}>
                    {parseFloat(tokenBalance).toFixed(2)} PZL
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
      </div>
    </Navbar>
  )
}

export default Navigation;
