import React, { useState, useEffect } from 'react';
import { Card, Button, Form, ListGroup, Badge, Alert } from 'react-bootstrap';
import { ethers } from 'ethers';
import QuestionSetList from './QuestionSetList';
import QuestionSetForm from './QuestionSetForm';
import ChainlinkSetup from './ChainlinkSetup';

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
        
        <ChainlinkSetup 
          provider={questionManager?.provider}
          questionManagerAddress={questionManager?.address}
        />
        
        <QuestionSetList 
          questionManager={questionManager} 
          refreshCounter={refreshCounter}
          onQuestionSetUpdated={handleRefresh}
        />
      </div>
    </div>
  );
};

export default AdminPanel; 