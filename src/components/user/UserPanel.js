import React from 'react';
import { Card, Button, ListGroup, Badge } from 'react-bootstrap';

const UserPanel = ({ account, balance, tokenBalance, puzzlePoints }) => {
  // Function to scroll to question sets
  const scrollToQuestionSets = () => {
    const questionSetsElement = document.querySelector('.available-question-sets');
    if (questionSetsElement) {
      questionSetsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Card className="my-4" style={{ borderRadius: '12px', boxShadow: '0 3px 15px rgba(0, 0, 0, 0.05)', border: 'none' }}>
      <Card.Header as="h5" style={{ backgroundColor: 'white', borderBottomColor: 'var(--neutral-lightest)', fontFamily: 'DM Sans, sans-serif' }}>User Dashboard</Card.Header>
      <Card.Body>
        <Card.Title style={{ color: 'var(--neutral-light)', fontWeight: 600 }}>Welcome, User</Card.Title>
        <Card.Text style={{ color: 'var(--neutral-lighter)' }}>
          This is your user dashboard. You can view your account information and perform actions here.
        </Card.Text>
        
        <ListGroup className="mb-3" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <ListGroup.Item style={{ borderColor: 'var(--neutral-lightest)' }}>
            <strong>Account:</strong> {account}
          </ListGroup.Item>
          <ListGroup.Item style={{ borderColor: 'var(--neutral-lightest)' }}>
            <strong>ETH Balance:</strong> {balance} ETH
          </ListGroup.Item>
          <ListGroup.Item style={{ borderColor: 'var(--neutral-lightest)' }}>
            <strong>PuzzlePoints Balance:</strong> {' '}
            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{tokenBalance} PP</span>
          </ListGroup.Item>
          <ListGroup.Item style={{ borderColor: 'var(--neutral-lightest)' }}>
            <strong>Status:</strong> <Badge bg="success" style={{ backgroundColor: 'var(--success)' }}>Active</Badge>
          </ListGroup.Item>
        </ListGroup>
        
        <div className="d-grid gap-2">
          <Button variant="primary" onClick={scrollToQuestionSets} style={{ borderRadius: '25px' }}>View Questions</Button>
          <Button variant="outline-secondary" style={{ borderRadius: '25px', borderColor: 'var(--neutral-lighter)', color: 'var(--neutral-light)' }}>My Assessment History</Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default UserPanel; 