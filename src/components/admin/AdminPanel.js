import React from 'react';
import { Card, Button, Form } from 'react-bootstrap';

const AdminPanel = ({ account }) => {
  return (
    <Card className="my-4">
      <Card.Header as="h5">Admin Dashboard</Card.Header>
      <Card.Body>
        <Card.Title>Welcome, Admin</Card.Title>
        <Card.Text>
          This is your admin control panel. You can manage users and system settings here.
        </Card.Text>
        
        <Form className="mb-3">
          <Form.Group className="mb-3">
            <Form.Label>Add New Admin</Form.Label>
            <Form.Control type="text" placeholder="Enter wallet address" />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>System Parameter</Form.Label>
            <Form.Control type="text" placeholder="Parameter value" />
          </Form.Group>
          
          <Button variant="primary">Save Changes</Button>
        </Form>
        
        <div className="mt-3">
          <p><strong>Current Admin:</strong> {account}</p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AdminPanel; 