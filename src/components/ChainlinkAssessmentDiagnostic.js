import React, { useState } from 'react';
import { Card, Button, Spinner, Alert, ListGroup, Badge } from 'react-bootstrap';
import { submitWithGasEstimate } from '../utils/contractTestUtils';

const ChainlinkAssessmentDiagnostic = ({ 
  questionManager, 
  questionSetId, 
  answersHash,
  onComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Running Chainlink assessment diagnostics...");
      console.log(`Question Set ID: ${questionSetId}`);
      console.log(`Answers Hash: ${answersHash}`);
      
      // Validate inputs
      if (!questionManager) {
        throw new Error("Question manager contract not provided");
      }
      
      if (!questionSetId) {
        throw new Error("Question set ID not provided");
      }
      
      if (!answersHash) {
        throw new Error("Answers hash not provided");
      }
      
      // Run gas estimation test
      const result = await submitWithGasEstimate(questionManager, questionSetId, answersHash);
      setResults(result);
      
      // If diagnostics completed successfully, notify parent
      if (onComplete && result.success) {
        onComplete(result);
      }
    } catch (err) {
      console.error("Error running diagnostics:", err);
      setError(err.message || "An unexpected error occurred");
      setResults({
        success: false,
        error: "Diagnostic tool error",
        details: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render status badge
  const renderStatusBadge = (success) => {
    return success ? 
      <Badge bg="success">Pass</Badge> : 
      <Badge bg="danger">Fail</Badge>;
  };
  
  // Helper function to determine alert variant based on results
  const getAlertVariant = () => {
    if (!results) return "primary";
    return results.success ? "success" : "danger";
  };
  
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Chainlink Assessment Diagnostics</h5>
        <Button 
          variant="primary" 
          size="sm"
          onClick={runDiagnostics}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Running...
            </>
          ) : "Run Diagnostics"}
        </Button>
      </Card.Header>
      
      <Card.Body>
        {!results && !error && !loading && (
          <Alert variant="info">
            Click "Run Diagnostics" to check your Chainlink assessment setup.
            This will analyze potential issues with gas estimation for assessment submission.
          </Alert>
        )}
        
        {error && (
          <Alert variant="danger">
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
          </Alert>
        )}
        
        {results && (
          <>
            <Alert variant={getAlertVariant()}>
              <Alert.Heading>
                {results.success ? "✅ Ready for submission" : "❌ Submission issues detected"}
              </Alert.Heading>
              <p>
                {results.success 
                  ? "Gas estimation successful. Your assessment can be submitted."
                  : results.details || "There were issues with the gas estimation. See details below."}
              </p>
            </Alert>
            
            <h6>Diagnostic Results:</h6>
            <ListGroup className="mb-3">
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                Gas Estimation
                {renderStatusBadge(results.success)}
              </ListGroup.Item>
              
              {results.gasEstimate && (
                <ListGroup.Item>
                  <small className="text-muted">Estimated Gas:</small> 
                  <div>{results.gasEstimate}</div>
                </ListGroup.Item>
              )}
              
              {results.error && (
                <ListGroup.Item>
                  <small className="text-muted">Error Message:</small>
                  <div className="text-danger">{results.error}</div>
                </ListGroup.Item>
              )}
            </ListGroup>
            
            {!results.success && (
              <div className="mt-3">
                <h6>Troubleshooting Steps:</h6>
                {results.error === 'Authorization error' && (
                  <Alert variant="warning">
                    <strong>Authorization Issue:</strong> The QuestionManager is not authorized to call the ChainlinkAnswerVerifier.
                    <div className="mt-2">
                      <strong>Fix:</strong> Run this command in your terminal:
                      <pre className="bg-dark text-light p-2 mt-1">
                        npx hardhat setup-chainlink-connection --network baseSepoliaTestnet
                      </pre>
                    </div>
                  </Alert>
                )}
                
                {(results.error === 'Missing source code' || results.error === 'Error accessing source code') && (
                  <Alert variant="warning">
                    <strong>Source Code Issue:</strong> The evaluation source code is not properly set in the ChainlinkAnswerVerifier.
                    <div className="mt-2">
                      <strong>Fix:</strong> Update the source code in the Chainlink Setup panel or run:
                      <pre className="bg-dark text-light p-2 mt-1">
                        npx hardhat update-chainlink --network baseSepoliaTestnet
                      </pre>
                    </div>
                  </Alert>
                )}
                
                {results.error === 'Missing subscription ID' && (
                  <Alert variant="warning">
                    <strong>Subscription ID Issue:</strong> The Chainlink subscription ID is not configured.
                    <div className="mt-2">
                      <strong>Fix:</strong> Update the subscription ID in the Chainlink Setup panel or run:
                      <pre className="bg-dark text-light p-2 mt-1">
                        npx hardhat update-chainlink --network baseSepoliaTestnet
                      </pre>
                    </div>
                  </Alert>
                )}
                
                {results.error === 'Assessment already being verified' && (
                  <Alert variant="warning">
                    <strong>Assessment Status Issue:</strong> This assessment is already in the verification process.
                    <div className="mt-2">
                      <strong>Fix:</strong> Wait for verification to complete, or reset the assessment status.
                    </div>
                  </Alert>
                )}
                
                {results.error === 'Insufficient funds' && (
                  <Alert variant="warning">
                    <strong>Wallet Issue:</strong> Your wallet doesn't have enough ETH to cover gas costs.
                    <div className="mt-2">
                      <strong>Fix:</strong> Get testnet ETH from a faucet:
                      <a 
                        href="https://www.coinbase.com/faucets/base-sepolia-faucet" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-block mt-1"
                      >
                        Base Sepolia Faucet
                      </a>
                    </div>
                  </Alert>
                )}
                
                {/* General case if none of the specific errors match */}
                {!['Authorization error', 'Missing source code', 'Error accessing source code', 
                   'Missing subscription ID', 'Assessment already being verified', 'Insufficient funds'].includes(results.error) && (
                  <Alert variant="warning">
                    <strong>General Issue:</strong> There was a problem with the gas estimation.
                    <div className="mt-2">
                      <strong>Debugging:</strong> Run the comprehensive test script:
                      <pre className="bg-dark text-light p-2 mt-1">
                        npm run test:chainlink-setup
                      </pre>
                    </div>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}
      </Card.Body>
      
      <Card.Footer className="text-muted">
        <small>
          📋 This tool helps identify issues with Chainlink Functions assessment submission.
          For more detailed diagnostics, run <code>npm run test:chainlink-setup</code> in your terminal.
        </small>
      </Card.Footer>
    </Card>
  );
};

export default ChainlinkAssessmentDiagnostic; 