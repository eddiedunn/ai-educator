import React from 'react';
import AdminPanel from '../components/admin/AdminPanel';

const AdminPage = ({ account, tokenBalance, puzzlePoints, questionManager }) => {
  return (
    <>
      <AdminPanel 
        account={account} 
        tokenBalance={tokenBalance} 
        puzzlePoints={puzzlePoints} 
        questionManager={questionManager} 
      />
    </>
  );
};

export default AdminPage; 