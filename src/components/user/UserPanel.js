import React from 'react';
import { Card, Button, ListGroup, Badge } from 'react-bootstrap';

const UserPanel = ({ account, balance, tokenBalance, puzzlePoints }) => {
  return (
    <Card className="my-4">
      <Card.Header as="h5">User Dashboard</Card.Header>
      <Card.Body>
        <Card.Title>Welcome, User</Card.Title>
        <Card.Text>
          This is your user dashboard. You can view your account information and perform actions here.
        </Card.Text>
        
        <ListGroup className="mb-3">
          <ListGroup.Item>
            <strong>Account:</strong> {account}
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>ETH Balance:</strong> {balance} ETH
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>PuzzlePoints Balance:</strong> {' '}
            {tokenBalance} PP
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Status:</strong> Active
          </ListGroup.Item>
        </ListGroup>
        
        <div className="d-grid gap-2">
          <Button variant="primary">View Questions</Button>
          <Button variant="outline-secondary">My Assessment History</Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default UserPanel; 