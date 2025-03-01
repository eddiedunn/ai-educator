import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import ChainlinkSetup from '../components/admin/ChainlinkSetup';
import ChainlinkAssessmentDiagnostic from '../components/ChainlinkAssessmentDiagnostic';

/**
 * ChainlinkAdminPage - Dedicated page for managing Chainlink integration
 * 
 * This page centralizes all Chainlink-related administration functionality,
 * including setup, configuration, and diagnostics for the Chainlink Functions integration.
 */
const ChainlinkAdminPage = ({ questionManager }) => {
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState('');
  const [testAnswersHash, setTestAnswersHash] = useState('0x0000000000000000000000000000000000000000000000000000000000000000');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleRunDiagnostics = () => {
    if (selectedQuestionSetId) {
      setShowDiagnostics(true);
    }
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <h2>Chainlink Administration</h2>
            </Card.Header>
            <Card.Body>
              <p className="lead">
                This page allows you to configure and manage the Chainlink Functions integration
                for automated assessment verification.
              </p>
              <p>
                Chainlink Functions enable decentralized and secure verification of assessment answers
                using off-chain computation while maintaining the integrity of the blockchain-based
                education platform.
              </p>
            </Card.Body>
          </Card>

          {/* Chainlink Setup Component */}
          <ChainlinkSetup 
            provider={questionManager?.provider}
            questionManager={questionManager}
          />
          
          {/* Chainlink Diagnostics Section */}
          <Card className="mt-4 mb-4">
            <Card.Header>
              <h4>Chainlink Diagnostics</h4>
            </Card.Header>
            <Card.Body>
              <p>
                Run diagnostics on a specific question set to test the Chainlink integration.
                This is useful for verifying that the setup is working correctly.
              </p>
              
              <Form className="mb-4">
                <Form.Group className="mb-3">
                  <Form.Label>Question Set ID</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter question set ID (e.g., 'univ2')" 
                    value={selectedQuestionSetId}
                    onChange={(e) => setSelectedQuestionSetId(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Enter the ID of the question set you want to test
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Test Answers Hash (Optional)</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="0x0000000000000000000000000000000000000000000000000000000000000000" 
                    value={testAnswersHash}
                    onChange={(e) => setTestAnswersHash(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Hash of test answers (defaults to zero hash for testing)
                  </Form.Text>
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  onClick={handleRunDiagnostics}
                  disabled={!selectedQuestionSetId}
                >
                  Run Diagnostics
                </Button>
              </Form>
              
              {showDiagnostics && selectedQuestionSetId && (
                <ChainlinkAssessmentDiagnostic 
                  questionManager={questionManager}
                  questionSetId={selectedQuestionSetId}
                  answersHash={testAnswersHash}
                  onComplete={() => console.log('Diagnostics completed')}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ChainlinkAdminPage; 