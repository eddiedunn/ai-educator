import React, { useState } from 'react';
import { Alert } from 'react-bootstrap';
import QuestionSetList from './QuestionSetList';
import QuestionSetForm from './QuestionSetForm';
import Leaderboard from './Leaderboard';

const AdminPanel = ({ account, puzzlePoints, questionManager }) => {
  const [statusMessage, setStatusMessage] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  return (
    <div className="container mt-3">
      {statusMessage && (
        <Alert variant={statusMessage.type} dismissible onClose={() => setStatusMessage(null)}>
          {statusMessage.text}
        </Alert>
      )}

      <div className="mt-2">
        <QuestionSetForm 
          questionManager={questionManager} 
          onQuestionSetCreated={handleRefresh} 
        />
        
        <QuestionSetList 
          questionManager={questionManager} 
          refreshCounter={refreshCounter}
          onQuestionSetUpdated={handleRefresh}
        />
        
        <Leaderboard puzzlePoints={puzzlePoints} />
      </div>
    </div>
  );
};

export default AdminPanel; 