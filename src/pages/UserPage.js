import React from 'react';
import { Container } from 'react-bootstrap';
import Navigation from '../components/Navigation';
import UserPanel from '../components/user/UserPanel';

const UserPage = ({ account, balance }) => {
  return (
    <Container>
      <Navigation account={account} />
      <h1 className="my-4 text-center">User Interface</h1>
      <UserPanel account={account} balance={balance} />
    </Container>
  );
};

export default UserPage; 