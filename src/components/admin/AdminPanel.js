import React, { useState, useEffect } from 'react';
import { Card, Button, Form, ListGroup, Badge, Alert, Tab, Tabs } from 'react-bootstrap';
import { ethers } from 'ethers';
import QuestionSetList from './QuestionSetList';
import QuestionSetForm from './QuestionSetForm';

const AdminPanel = ({ account, puzzlePoints, questionManager }) => {
  const [adminBalance, setAdminBalance] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('questionSets');
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchAdminBalance = async () => {
      try {
        if (puzzlePoints && account) {
          const balance = await puzzlePoints.balanceOf(account);
          setAdminBalance(ethers.utils.formatUnits(balance, 18));
        }
      } catch (error) {
        console.error("Error fetching admin balance:", error);
        setStatusMessage({ type: 'danger', text: 'Error fetching balance: ' + error.message });
      }
    };

    fetchAdminBalance();
  }, [puzzlePoints, account, refreshCounter]);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      if (!ethers.utils.isAddress(newAdminAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      // Mint initial tokens to the new admin
      const tx = await puzzlePoints.mint(
        newAdminAddress,
        ethers.utils.parseUnits('100', 18)
      );

      setStatusMessage({ type: 'info', text: 'Transaction sent! Waiting for confirmation...' });
      
      await tx.wait();
      
      setStatusMessage({ type: 'success', text: 'New admin added successfully with initial tokens!' });
      setNewAdminAddress('');
    } catch (error) {
      console.error("Error adding admin:", error);
      setStatusMessage({ type: 'danger', text: 'Error adding admin: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  return (
    <div className="container mt-4">
      <Card className="mb-4">
        <Card.Header as="h3">Admin Panel</Card.Header>
        <Card.Body>
          <div className="mb-4">
            <h4>Welcome, Admin!</h4>
            <p><strong>Account:</strong> {account}</p>
            <p><strong>Token Balance:</strong> {adminBalance} PuzzlePoints</p>
          </div>

          {statusMessage && (
            <Alert variant={statusMessage.type} dismissible onClose={() => setStatusMessage(null)}>
              {statusMessage.text}
            </Alert>
          )}

          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="token" title="Admin Management">
              <div className="row mt-4">
                <div className="col-md-6">
                  <Card>
                    <Card.Header>Add New Admin</Card.Header>
                    <Card.Body>
                      <Form onSubmit={handleAddAdmin}>
                        <Form.Group className="mb-3">
                          <Form.Label>New Admin Address</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="0x..."
                            value={newAdminAddress}
                            onChange={(e) => setNewAdminAddress(e.target.value)}
                            disabled={isLoading}
                            required
                          />
                          <Form.Text className="text-muted">
                            New admin will receive 100 PuzzlePoints tokens.
                          </Form.Text>
                        </Form.Group>

                        <Button 
                          variant="success" 
                          type="submit" 
                          disabled={isLoading}
                        >
                          {isLoading ? 'Processing...' : 'Add Admin'}
                        </Button>
                      </Form>
                    </Card.Body>
                  </Card>
                </div>

                <div className="col-md-6">
                  <Card>
                    <Card.Header>About PuzzlePoints</Card.Header>
                    <Card.Body>
                      <p>
                        PuzzlePoints are non-transferable tokens used in the AI Educator platform. 
                        They serve as a measure of administrative privileges and educational achievements.
                      </p>
                      <p className="mb-0">
                        <strong>Contract Address:</strong><br />
                        <small className="text-muted">{puzzlePoints?.address || 'Loading...'}</small>
                      </p>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            </Tab>
            
            <Tab eventKey="questionSets" title="Question Set Management">
              <div className="mt-4">
                <QuestionSetForm 
                  questionManager={questionManager} 
                  onQuestionSetCreated={handleRefresh} 
                />
                
                <QuestionSetList 
                  questionManager={questionManager} 
                  refreshCounter={refreshCounter}
                  onQuestionSetUpdated={handleRefresh}
                />
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminPanel; 