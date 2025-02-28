import React from 'react';
import AdminPanel from '../components/admin/AdminPanel';

const AdminPage = ({ account, tokenBalance, puzzlePoints }) => {
  return (
    <>
      <h1 className="my-4 text-center">Admin Interface</h1>
      <AdminPanel account={account} tokenBalance={tokenBalance} puzzlePoints={puzzlePoints} />
    </>
  );
};

export default AdminPage; 