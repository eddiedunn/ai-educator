import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Button, 
  Alert, 
  Spinner, 
  Row, 
  Col, 
  Accordion,
  Badge
} from 'react-bootstrap';
import { 
  setupChainlinkVerifier, 
  testChainlinkVerifier, 
  getChainlinkSetupConfig,
  CHAINLINK_EVALUATION_SOURCE
} from '../../utils/setupChainlinkVerifier';

/**
 * Component for setting up and testing Chainlink Functions
 * 
 * @param {Object} props
 * @param {Object} props.provider - The ethers provider
 * @param {string} props.questionManagerAddress - The address of the QuestionManager contract
 */
const ChainlinkSetup = ({ provider, questionManagerAddress }) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState({
    donId: '',
    subscriptionId: '',
    isConfigured: false,
    sourceCode: ''
  });
  const [statusMessage, setStatusMessage] = useState(null);

  // Load existing config on component mount
  useEffect(() => {
    const loadConfig = async () => {
      if (provider && questionManagerAddress) {
        setLoading(true);
        try {
          const currentConfig = await getChainlinkSetupConfig(provider, questionManagerAddress);
          if (currentConfig.success) {
            // Pre-populate form with existing values if available
            setConfig({
              donId: currentConfig.chainlinkConfig?.donId || '',
              subscriptionId: currentConfig.chainlinkConfig?.subscriptionId?.toString() || '',
              isConfigured: currentConfig.isConfigured,
              sourceCode: currentConfig.sourceCode || CHAINLINK_EVALUATION_SOURCE
            });
            
            setStatusMessage({
              type: currentConfig.isConfigured ? 'success' : 'warning',
              text: currentConfig.isConfigured 
                ? 'Chainlink Functions are properly configured!' 
                : 'Chainlink Functions need to be configured.'
            });
          } else {
            setStatusMessage({
              type: 'danger',
              text: currentConfig.message || 'Failed to load configuration'
            });
          }
        } catch (error) {
          console.error('Error loading Chainlink config:', error);
          setStatusMessage({
            type: 'danger',
            text: `Error loading configuration: ${error.message}`
          });
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadConfig();
  }, [provider, questionManagerAddress]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle setup Chainlink Functions
  const handleSetup = async (e) => {
    e.preventDefault();
    
    if (!config.donId || !config.subscriptionId) {
      setStatusMessage({
        type: 'danger',
        text: 'Please provide both DON ID and Subscription ID'
      });
      return;
    }
    
    setSubmitting(true);
    setStatusMessage(null);
    
    try {
      const result = await setupChainlinkVerifier(
        provider,
        questionManagerAddress,
        config.donId,
        config.subscriptionId,
        config.sourceCode
      );
      
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: result.message
        });
        
        // Refresh the config
        const updatedConfig = await getChainlinkSetupConfig(provider, questionManagerAddress);
        if (updatedConfig.success) {
          setConfig(prev => ({
            ...prev,
            isConfigured: updatedConfig.isConfigured
          }));
        }
      } else {
        setStatusMessage({
          type: 'danger',
          text: result.message || 'Failed to setup Chainlink Functions'
        });
      }
    } catch (error) {
      console.error('Error setting up Chainlink Functions:', error);
      setStatusMessage({
        type: 'danger',
        text: `Error: ${error.message}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Test Chainlink Functions
  const handleTest = async () => {
    setTesting(true);
    setStatusMessage(null);
    
    try {
      const result = await testChainlinkVerifier(
        provider,
        questionManagerAddress,
        'univ2' // Default test question set
      );
      
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: result.message,
          txHash: result.transactionHash
        });
      } else {
        setStatusMessage({
          type: 'danger',
          text: result.message || 'Failed to test Chainlink Functions'
        });
      }
    } catch (error) {
      console.error('Error testing Chainlink Functions:', error);
      setStatusMessage({
        type: 'danger',
        text: `Error: ${error.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  if (!provider || !questionManagerAddress) {
    return (
      <Alert variant="warning">
        Blockchain connection not available. Please connect your wallet.
      </Alert>
    );
  }

  return (
    <Card className="mt-4 mb-4">
      <Card.Header>
        <h4>
          Chainlink Functions Setup
          {config.isConfigured && (
            <Badge bg="success" className="ms-2">Configured</Badge>
          )}
        </h4>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading Chainlink configuration...</p>
          </div>
        ) : (
          <>
            {statusMessage && (
              <Alert 
                variant={statusMessage.type} 
                className="mb-4"
                dismissible={!submitting && !testing}
                onClose={() => setStatusMessage(null)}
              >
                <strong>{statusMessage.type === 'success' ? 'Success:' : 'Error:'}</strong> {statusMessage.text}
                {statusMessage.txHash && (
                  <div className="mt-2">
                    <small>Transaction: {statusMessage.txHash}</small>
                  </div>
                )}
              </Alert>
            )}

            <Form onSubmit={handleSetup}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>DON ID</Form.Label>
                    <Form.Control
                      type="text"
                      name="donId"
                      value={config.donId}
                      onChange={handleInputChange}
                      placeholder="Enter Chainlink DON ID"
                      disabled={submitting || testing}
                      required
                    />
                    <Form.Text className="text-muted">
                      The Decentralized Oracle Network ID for Chainlink Functions
                    </Form.Text>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subscription ID</Form.Label>
                    <Form.Control
                      type="text"
                      name="subscriptionId"
                      value={config.subscriptionId}
                      onChange={handleInputChange}
                      placeholder="Enter Chainlink subscription ID"
                      disabled={submitting || testing}
                      required
                    />
                    <Form.Text className="text-muted">
                      Your Chainlink Functions subscription ID
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-between mt-4">
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={submitting || testing || (!config.donId || !config.subscriptionId)}
                >
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Setting Up...
                    </>
                  ) : 'Setup Chainlink Functions'}
                </Button>
                
                <Button 
                  variant="outline-secondary" 
                  onClick={handleTest}
                  disabled={testing || submitting || !config.isConfigured}
                >
                  {testing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Testing...
                    </>
                  ) : 'Test Verification'}
                </Button>
              </div>
            </Form>

            <hr className="my-4" />

            <div className="mt-4">
              <h5>Test Verification</h5>
              <p>
                Test the Chainlink Functions integration using the "univ2" question set.
                Make sure you have created and activated this question set.
              </p>
              <div className="d-grid">
                <Button 
                  variant={config.isConfigured ? "success" : "secondary"}
                  onClick={handleTest}
                  disabled={testing || submitting || !config.isConfigured}
                >
                  {testing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Testing Chainlink Verification...
                    </>
                  ) : 'Run Test Verification'}
                </Button>
              </div>
            </div>

            <Accordion className="mt-4">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Advanced: Source Code</Accordion.Header>
                <Accordion.Body>
                  <p className="text-muted">
                    This is the JavaScript source code that will be executed by Chainlink Functions
                    when a user submits their assessment. You can modify it if needed.
                  </p>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      name="sourceCode"
                      value={config.sourceCode}
                      onChange={handleInputChange}
                      rows={10}
                      disabled={submitting}
                      style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                    />
                  </Form.Group>
                  <div className="mt-3">
                    <Alert variant="info">
                      <strong>Note:</strong> Modifying the source code requires redeploying the setup.
                      Changes will take effect after clicking the "Setup Chainlink Functions" button.
                    </Alert>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ChainlinkSetup; 