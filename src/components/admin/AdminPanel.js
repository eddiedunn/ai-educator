import React, { useState } from 'react';
import { Card, Button, Form, ListGroup, Badge, Alert } from 'react-bootstrap';
import { ethers } from 'ethers';

const AdminPanel = ({ account, tokenBalance, puzzlePoints }) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async () => {
    if (!recipientAddress || !tokenAmount) {
      setMessage({ type: 'danger', text: 'Please enter both address and amount' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage('');
      const amount = ethers.utils.parseUnits(tokenAmount, 18);
      const tx = await puzzlePoints.transfer(recipientAddress, amount);
      await tx.wait();
      setMessage({ type: 'success', text: `Successfully transferred ${tokenAmount} PuzzlePoints to ${recipientAddress}` });
      setRecipientAddress('');
      setTokenAmount('');
    } catch (error) {
      setMessage({ type: 'danger', text: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="my-4">
      <Card.Header as="h5">Admin Dashboard</Card.Header>
      <Card.Body>
        <Card.Title>Welcome, Admin</Card.Title>
        <Card.Text>
          This is your admin control panel. You can manage users, tokens, and system settings here.
        </Card.Text>
        
        <ListGroup className="mb-3">
          <ListGroup.Item>
            <strong>Account:</strong> {account}
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>PuzzlePoints Balance:</strong> {' '}
            <Badge bg="primary">{tokenBalance}</Badge> PZLPT
          </ListGroup.Item>
        </ListGroup>
        
        {message && (
          <Alert variant={message.type} dismissible onClose={() => setMessage('')}>
            {message.text}
          </Alert>
        )}
        
        <h5 className="mt-4">Token Management</h5>
        <Form className="mb-3">
          <Form.Group className="mb-3">
            <Form.Label>Transfer PuzzlePoints</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Recipient address" 
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <Form.Control 
              type="number" 
              placeholder="Token amount" 
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
            />
          </Form.Group>
          
          <Button 
            variant="primary" 
            onClick={handleTransfer}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Transfer Tokens'}
          </Button>
        </Form>
        
        <h5 className="mt-4">System Configuration</h5>
        <Form className="mb-3">
          <Form.Group className="mb-3">
            <Form.Label>Add New Admin</Form.Label>
            <Form.Control type="text" placeholder="Enter wallet address" />
          </Form.Group>
          
          <Button variant="secondary">Save Changes</Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default AdminPanel; 