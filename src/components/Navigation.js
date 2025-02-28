import { Navbar, Container, Nav } from 'react-bootstrap'
import logo from '../logo.png'

const Navigation = ({ account, userRole }) => {
  return (
    <Navbar className='my-3' expand="lg">
      <Container>
        <Navbar.Brand href="/">
          <img src={logo} width="40" height="40" className="" alt="" />
          &nbsp; AI Educator Platform
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {userRole === 'admin' && (
              <Nav.Link href="#admin">Admin Dashboard</Nav.Link>
            )}
            {userRole === 'user' && (
              <Nav.Link href="#user">User Dashboard</Nav.Link>
            )}
            {userRole && (
              <Nav.Link href="#profile">Profile</Nav.Link>
            )}
          </Nav>
          <Nav>
            {account ? (
              <Nav.Link
                href={`https://etherscan.io/address/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button nav-button btn-sm mx-4">
                <span>{account.slice(0, 6) + '...' + account.slice(38, 42)}</span>
                {userRole === 'admin' && <span className="ms-2 badge bg-danger">Admin</span>}
                {userRole === 'user' && <span className="ms-2 badge bg-success">User</span>}
              </Nav.Link>
            ) : (
              <Nav.Link
                className="button nav-button btn-sm mx-4">
                Connect Wallet
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Navigation;
