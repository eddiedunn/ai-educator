import React from 'react';
import { Container } from 'react-bootstrap';
import AdminPanel from '../components/admin/AdminPanel';

const AdminPage = ({ account }) => {
  return (
    <>
      <h1 className="my-4 text-center">Admin Interface</h1>
      <AdminPanel account={account} />
    </>
  );
};

export default AdminPage; 