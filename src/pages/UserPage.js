import React from 'react';
import AvailableQuestionSets from '../components/user/AvailableQuestionSets';

const UserPage = ({ questionManager }) => {
  return (
    <>
      <AvailableQuestionSets questionManager={questionManager} />
    </>
  );
};

export default UserPage; 