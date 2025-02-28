import React from 'react';
import { Container } from 'react-bootstrap';
import Navigation from '../components/Navigation';
import AdminPanel from '../components/admin/AdminPanel';

const AdminPage = ({ account }) => {
  return (
    <Container>
      <Navigation account={account} />
      <h1 className="my-4 text-center">Admin Interface</h1>
      <AdminPanel account={account} />
    </Container>
  );
};

export default AdminPage; 