import { Navbar, Container, Nav } from 'react-bootstrap'
import logo from '../logo.png'

const Navigation = ({ account, userRole }) => {
  return (
    <Navbar className='my-3' expand="lg">
      <Container>
        <Navbar.Brand href="/" className="d-flex align-items-center">
          <img src={logo} width="40" height="40" className="me-2" alt="Logo" />
          <span className="d-none d-sm-inline">AI Educator</span>
          {userRole === 'admin' && <span className="ms-2 badge bg-danger">Admin</span>}
          {userRole === 'user' && <span className="ms-2 badge bg-success">User</span>}
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {userRole === 'admin' && (
              <>
                <Nav.Link href="#admin">Dashboard</Nav.Link>
                <Nav.Link href="#manage-users">Manage Users</Nav.Link>
                <Nav.Link href="#settings">Settings</Nav.Link>
              </>
            )}
            
            {userRole === 'user' && (
              <>
                <Nav.Link href="#user">Dashboard</Nav.Link>
                <Nav.Link href="#courses">My Courses</Nav.Link>
                <Nav.Link href="#progress">Progress</Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            {account ? (
              <Nav.Item className="d-flex align-items-center">
                <div className="px-3 py-1 border rounded-3 text-muted small">
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
  )
}

export default Navigation;
