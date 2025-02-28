import React from 'react';
import UserPanel from '../components/user/UserPanel';

const UserPage = ({ account, balance }) => {
  return (
    <>
      <h1 className="my-4 text-center">User Interface</h1>
      <UserPanel account={account} balance={balance} />
    </>
  );
};

export default UserPage; 