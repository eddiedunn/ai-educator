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
import { ethers } from 'ethers';

/**
 * Component for setting up and testing Chainlink Functions
 * 
 * @param {Object} props
 * @param {Object} props.provider - The ethers provider
 * @param {string} props.questionManagerAddress - The address of the QuestionManager contract
 */
const ChainlinkSetup = ({ provider, questionManager }) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState({
    donId: '',
    subscriptionId: '',
    isConfigured: false,
    sourceCode: CHAINLINK_EVALUATION_SOURCE
  });
  const [statusMessage, setStatusMessage] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const [showContractOverride, setShowContractOverride] = useState(false);
  const [contractAddressOverride, setContractAddressOverride] = useState('');
  const [useOverrideAddress, setUseOverrideAddress] = useState(false);

  // Function to check contract code
  const checkContractCode = async (address) => {
    if (!provider) return null;
    
    try {
      const code = await provider.getCode(address);
      return code !== '0x' ? { exists: true, code } : { exists: false };
    } catch (error) {
      console.error("Error checking contract code:", error);
      return { exists: false, error };
    }
  };

  // Load existing config on component mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!provider || !questionManager?.address) {
        setStatusMessage({
          type: 'warning',
          text: 'Blockchain connection not available or contract not initialized. Please connect your wallet.'
        });
        return;
      }
      
      setLoading(true);
      setNetworkError(false);
      
      // Check if contract exists at the address
      const contractAddress = useOverrideAddress && contractAddressOverride 
        ? contractAddressOverride 
        : questionManager.address;
        
      const contractStatus = await checkContractCode(contractAddress);
      
      // Update diagnostic info with contract status
      setDiagnosticInfo(prev => ({
        ...(prev || {}),
        contractStatus,
        contractAddress
      }));
      
      if (contractStatus && !contractStatus.exists) {
        setNetworkError(true);
        setStatusMessage({
          type: 'danger',
          text: `No contract code found at address ${contractAddress}. The contract may not be deployed on this network.`
        });
        setLoading(false);
        return;
      }
      
      try {
        const currentConfig = await getChainlinkSetupConfig(
          provider, 
          useOverrideAddress && contractAddressOverride ? contractAddressOverride : questionManager.address
        );
        
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
          
          // Clear any previous diagnostic info
          setDiagnosticInfo(prev => ({
            ...(prev || {}),
            contractStatus,
            verifierStatus: currentConfig.verifierStatus,
            chainlinkConfig: currentConfig.chainlinkConfig
          }));
        } else {
          setStatusMessage({
            type: 'danger',
            text: currentConfig.message || 'Failed to load configuration'
          });
          
          // Save diagnostic info
          setDiagnosticInfo(prev => ({
            ...(prev || {}),
            contractStatus,
            contractAddress: currentConfig.contractAddress,
            networkInfo: currentConfig.networkInfo,
            error: currentConfig.error
          }));
        }
      } catch (error) {
        console.error('Error loading Chainlink config:', error);
        
        // Check if it's a contract call error
        if (error.code === 'CALL_EXCEPTION') {
          setNetworkError(true);
          setStatusMessage({
            type: 'danger',
            text: 'Unable to connect to the Chainlink contract. This could be due to network issues or the contract is not properly deployed.'
          });
          
          // Save diagnostic info
          setDiagnosticInfo(prev => ({
            ...(prev || {}),
            contractStatus,
            error: error,
            errorCode: error.code,
            errorMessage: error.message,
            data: error.data,
            transaction: error.transaction
          }));
        } else {
          setStatusMessage({
            type: 'danger',
            text: `Error loading configuration: ${error.message || 'Unknown error'}`
          });
          
          // Save diagnostic info
          setDiagnosticInfo(prev => ({
            ...(prev || {}),
            contractStatus,
            error: error
          }));
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, [provider, questionManager, useOverrideAddress, contractAddressOverride]);

  // Handle contract override changes
  const handleContractAddressChange = (e) => {
    setContractAddressOverride(e.target.value);
  };

  const applyContractOverride = () => {
    if (ethers.utils.isAddress(contractAddressOverride)) {
      setUseOverrideAddress(true);
      // This will trigger the useEffect to reload with the new address
    } else {
      setStatusMessage({
        type: 'danger',
        text: 'Invalid Ethereum address format'
      });
    }
  };

  const resetContractOverride = () => {
    setUseOverrideAddress(false);
    setContractAddressOverride('');
    // This will trigger the useEffect to reload with the original address
  };

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
        questionManager.address,
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
        const updatedConfig = await getChainlinkSetupConfig(provider, questionManager.address);
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
        text: `Error: ${error.message || 'Failed to setup Chainlink Functions'}`
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
        questionManager.address,
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

  if (!provider || !questionManager?.address) {
    return (
      <Card className="mt-4 mb-4">
        <Card.Header>
          <h4>Chainlink Functions Setup</h4>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            Blockchain connection not available. Please connect your wallet.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // If there's a network error, show a simplified form that allows setup
  if (networkError) {
    return (
      <Card className="mt-4 mb-4">
        <Card.Header>
          <h4>Chainlink Functions Setup</h4>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger" className="mb-4">
            <Alert.Heading>Connection Error</Alert.Heading>
            <p>Unable to connect to the Chainlink contract. This could be due to network issues or the contract is not properly deployed.</p>
            <p>You can still attempt to configure the contract with the form below or try a different contract address.</p>
            
            {/* Contract address override section */}
            <div className="mt-3">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowContractOverride(!showContractOverride)}
                className="mb-2"
              >
                {showContractOverride ? 'Hide' : 'Show'} Contract Address Override
              </Button>
              
              {showContractOverride && (
                <div className="p-3 border rounded">
                  <Form.Group className="mb-2">
                    <Form.Label>Contract Address</Form.Label>
                    <Form.Control
                      type="text"
                      value={contractAddressOverride}
                      onChange={handleContractAddressChange}
                      placeholder="Enter QuestionManager contract address"
                    />
                    <Form.Text className="text-muted">
                      Current address: {questionManager?.address || 'Not available'}
                    </Form.Text>
                  </Form.Group>
                  
                  <div className="d-flex gap-2">
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={applyContractOverride}
                      disabled={!contractAddressOverride || !ethers.utils.isAddress(contractAddressOverride)}
                    >
                      Use This Address
                    </Button>
                    
                    {useOverrideAddress && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={resetContractOverride}
                      >
                        Reset to Original
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {diagnosticInfo && (
              <div className="mt-3">
                <Accordion>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Technical Details</Accordion.Header>
                    <Accordion.Body>
                      <h6>Contract Information:</h6>
                      <p>Contract Address: {diagnosticInfo.contractAddress || questionManager?.address || 'Not available'}</p>
                      <p>Network: {diagnosticInfo.networkInfo?.chainId ? `${diagnosticInfo.networkInfo.name} (ID: ${diagnosticInfo.networkInfo.chainId})` : 'Unknown'}</p>
                      <p>Contract exists: {diagnosticInfo.contractStatus?.exists ? 'Yes' : 'No'}</p>
                      
                      <h6>Error Information:</h6>
                      <p>Error Code: {diagnosticInfo.errorCode || diagnosticInfo.error?.code || 'Not available'}</p>
                      <p>Error Message: {diagnosticInfo.errorMessage || diagnosticInfo.error?.message || 'No specific error message'}</p>
                      
                      {diagnosticInfo.transaction && (
                        <>
                          <h6>Transaction Details:</h6>
                          <p>From: {diagnosticInfo.transaction.from}</p>
                          <p>To: {diagnosticInfo.transaction.to}</p>
                          <p>Data: {diagnosticInfo.transaction.data}</p>
                        </>
                      )}
                      
                      <p className="text-muted small">
                        This error may indicate that the contract at this address doesn't exist, 
                        doesn't have the expected functions, or you might be connected to the wrong network.
                      </p>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </div>
            )}
          </Alert>

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
                    disabled={submitting}
                    required
                  />
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
                    disabled={submitting}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button 
                variant="primary" 
                type="submit"
                disabled={submitting || (!config.donId || !config.subscriptionId)}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Setting Up...
                  </>
                ) : 'Setup Chainlink Functions'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
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
            {/* Contract address override section */}
            {!networkError && (
              <div className="mb-4">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setShowContractOverride(!showContractOverride)}
                  className="mb-2"
                >
                  {showContractOverride ? 'Hide' : 'Show'} Contract Address Override
                </Button>
                
                {showContractOverride && (
                  <div className="p-3 border rounded">
                    <Form.Group className="mb-2">
                      <Form.Label>Contract Address</Form.Label>
                      <Form.Control
                        type="text"
                        value={contractAddressOverride}
                        onChange={handleContractAddressChange}
                        placeholder="Enter QuestionManager contract address"
                      />
                      <Form.Text className="text-muted">
                        Current address: {questionManager?.address || 'Not available'}
                        {useOverrideAddress && ' (using override)'}
                      </Form.Text>
                    </Form.Group>
                    
                    <div className="d-flex gap-2">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={applyContractOverride}
                        disabled={!contractAddressOverride || !ethers.utils.isAddress(contractAddressOverride)}
                      >
                        Use This Address
                      </Button>
                      
                      {useOverrideAddress && (
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={resetContractOverride}
                        >
                          Reset to Original
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
                
                {diagnosticInfo && statusMessage.type === 'danger' && (
                  <div className="mt-3">
                    <Accordion>
                      <Accordion.Item eventKey="0">
                        <Accordion.Header>Technical Details</Accordion.Header>
                        <Accordion.Body>
                          <h6>Contract Information:</h6>
                          <p>Contract Address: {diagnosticInfo.contractAddress || questionManager?.address || 'Not available'}</p>
                          <p>Network: {diagnosticInfo.networkInfo?.chainId ? `${diagnosticInfo.networkInfo.name} (ID: ${diagnosticInfo.networkInfo.chainId})` : 'Unknown'}</p>
                          <p>Contract exists: {diagnosticInfo.contractStatus?.exists ? 'Yes' : 'No'}</p>
                          
                          <h6>Error Information:</h6>
                          <p>Error Code: {diagnosticInfo.errorCode || diagnosticInfo.error?.code || 'Not available'}</p>
                          <p>Error Message: {diagnosticInfo.errorMessage || diagnosticInfo.error?.message || 'No specific error message'}</p>
                          
                          {diagnosticInfo.transaction && (
                            <>
                              <h6>Transaction Details:</h6>
                              <p>From: {diagnosticInfo.transaction.from}</p>
                              <p>To: {diagnosticInfo.transaction.to}</p>
                              <p>Data: {diagnosticInfo.transaction.data}</p>
                            </>
                          )}
                          
                          <p className="text-muted small">
                            If you're getting a "missing revert data" or "CALL_EXCEPTION" error, it usually means that:
                            <br />1. The contract at this address doesn't exist
                            <br />2. The contract doesn't have the expected functions
                            <br />3. You might be connected to the wrong network
                            <br />4. The contract needs to be initialized first
                          </p>
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
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