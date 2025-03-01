import React, { useState } from 'react';
import { Card, Button, Accordion, Badge, Spinner } from 'react-bootstrap';
import { ethers } from 'ethers';
import {
  checkQuestionSet,
  checkPreviousAssessment,
  checkVerifierSetup,
  disableChainlinkTemporarily,
  enableChainlink,
  restartAssessment,
  submitWithChainlinkBypass
} from '../utils/contractTestUtils';

/**
 * A component that provides a UI for running contract diagnostics
 * This is helpful for users who need to debug issues with the submission process
 */
const DiagnosticPanel = ({ questionSetId, questionManager }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState({
    questionSet: null,
    assessment: null,
    verifier: null
  });
  const [error, setError] = useState(null);
  const [bypassStatus, setBypassStatus] = useState(null);

  const runDiagnostics = async () => {
    if (!questionManager || !questionSetId) {
      setError("Question manager or question set ID not available");
      return;
    }

    setIsRunning(true);
    setError(null);
    
    try {
      // Run all diagnostic checks one by one
      const questionSetResult = await checkQuestionSet(questionManager, questionSetId);
      setResults(prev => ({ ...prev, questionSet: questionSetResult }));
      
      if (questionSetResult.exists) {
        const assessmentResult = await checkPreviousAssessment(questionManager, questionSetId);
        setResults(prev => ({ ...prev, assessment: assessmentResult }));
      }
      
      // Check verifier setup
      const provider = questionManager.provider;
      const verifierResult = await checkVerifierSetup(questionManager, provider);
      setResults(prev => ({ ...prev, verifier: verifierResult }));
      
    } catch (err) {
      console.error("Error running diagnostics:", err);
      setError(`Diagnostic error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  const handleRestartAssessment = async () => {
    if (!questionManager || !questionSetId) {
      setError("Question manager or question set ID not available");
      return;
    }
    
    try {
      await restartAssessment(questionManager, questionSetId);
      // Re-run the assessment check to see if it worked
      const assessmentResult = await checkPreviousAssessment(questionManager, questionSetId);
      setResults(prev => ({ ...prev, assessment: assessmentResult }));
    } catch (err) {
      setError(`Error restarting assessment: ${err.message}`);
    }
  };
  
  const handleDisableChainlink = async () => {
    if (!questionManager) {
      setError("Question manager not available");
      return;
    }
    
    try {
      await disableChainlinkTemporarily(questionManager);
      // Re-run the verifier check
      const provider = questionManager.provider;
      const verifierResult = await checkVerifierSetup(questionManager, provider);
      setResults(prev => ({ ...prev, verifier: verifierResult }));
    } catch (err) {
      setError(`Error disabling Chainlink: ${err.message}`);
    }
  };
  
  const handleEnableChainlink = async () => {
    if (!questionManager) {
      setError("Question manager not available");
      return;
    }
    
    try {
      await enableChainlink(questionManager);
      // Re-run the verifier check
      const provider = questionManager.provider;
      const verifierResult = await checkVerifierSetup(questionManager, provider);
      setResults(prev => ({ ...prev, verifier: verifierResult }));
    } catch (err) {
      setError(`Error enabling Chainlink: ${err.message}`);
    }
  };
  
  const handleBypassChainlinkSubmit = async () => {
    if (!questionManager || !questionSetId) {
      setError("Question manager or question set ID not available");
      return;
    }
    
    setBypassStatus({ isSubmitting: true, message: "Preparing submission..." });
    setError(null);
    
    try {
      // First check if there's an existing assessment that's completed
      const assessmentResult = await checkPreviousAssessment(questionManager, questionSetId);
      
      if (assessmentResult.completed) {
        setBypassStatus({ isSubmitting: true, message: "Restarting existing assessment..." });
        await restartAssessment(questionManager, questionSetId);
      }
      
      // Get answers hash from localStorage if possible
      const provider = questionManager.provider;
      const userAddress = await questionManager.signer.getAddress();
      const localStorageKey = `answers_${questionSetId}_${userAddress}`;
      const storedAnswers = localStorage.getItem(localStorageKey);
      
      let answersHash;
      if (storedAnswers) {
        try {
          const parsedAnswers = JSON.parse(storedAnswers);
          answersHash = parsedAnswers.hash;
          setBypassStatus({ isSubmitting: true, message: "Retrieved stored answers hash" });
        } catch (e) {
          setError("Error parsing stored answers");
          setBypassStatus({ isSubmitting: false, success: false, message: "Failed to retrieve answers hash" });
          return;
        }
      } else {
        // Prompt for hash if not found in localStorage
        const promptedHash = prompt("Please enter your answers hash:");
        if (!promptedHash) {
          setBypassStatus({ isSubmitting: false, success: false, message: "Submission canceled" });
          return;
        }
        answersHash = promptedHash;
      }
      
      setBypassStatus({ isSubmitting: true, message: "Submitting with Chainlink bypass..." });
      
      const result = await submitWithChainlinkBypass(
        questionManager,
        provider,
        questionSetId,
        answersHash
      );
      
      if (result.success) {
        setBypassStatus({ 
          isSubmitting: false, 
          success: true, 
          message: "Submission successful! 🎉",
          txHash: result.transactionHash
        });
      } else {
        setBypassStatus({ 
          isSubmitting: false, 
          success: false, 
          message: `Submission failed: ${result.error}`,
          stage: result.stage
        });
      }
      
      // Refresh diagnostics
      runDiagnostics();
      
    } catch (err) {
      console.error("Error during Chainlink bypass submission:", err);
      setError(`Submission error: ${err.message}`);
      setBypassStatus({ 
        isSubmitting: false, 
        success: false, 
        message: "Submission failed due to error"
      });
    }
  };
  
  const questionSetStatus = () => {
    const result = results.questionSet;
    if (!result) return null;
    
    return (
      <div>
        <h6>Question Set Check</h6>
        {result.exists ? (
          <div>
            <Badge bg="success">Exists ✓</Badge>{' '}
            <Badge bg={result.isActive ? "success" : "danger"}>
              {result.isActive ? "Active ✓" : "Inactive ✗"}
            </Badge>
            
            <div className="mt-2">
              <small>Content Hash: {result.contentHash || 'Not available'}</small>
            </div>
            
            {!result.isActive && (
              <div className="alert alert-warning mt-2">
                This question set is not active. Only the contract owner can activate it.
              </div>
            )}
          </div>
        ) : (
          <div>
            <Badge bg="danger">Not Found ✗</Badge>
            <div className="mt-2">
              <small>Available sets: {result.allSets ? result.allSets.join(', ') : 'None'}</small>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const assessmentStatus = () => {
    const result = results.assessment;
    if (!result) return null;
    
    return (
      <div className="mt-3">
        <h6>Assessment Status</h6>
        {result.exists ? (
          <div>
            <Badge bg={result.completed ? "warning" : "success"}>
              {result.completed ? "Completed ⚠" : "In Progress ✓"}
            </Badge>
            
            {result.completed && (
              <div className="mt-2">
                <Button 
                  variant="warning" 
                  size="sm" 
                  onClick={handleRestartAssessment}
                >
                  Restart Assessment
                </Button>
                <div className="mt-1">
                  <small>This will allow you to resubmit your answers.</small>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Badge bg="success">No Assessment Found ✓</Badge>
            <div className="mt-1">
              <small>You can submit a new assessment.</small>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const verifierStatus = () => {
    const result = results.verifier;
    if (!result) return null;
    
    return (
      <div className="mt-3">
        <h6>Chainlink Verifier Status</h6>
        <Badge bg={result.enabled ? (result.configured ? "success" : "danger") : "secondary"}>
          {!result.enabled ? "Disabled" : (result.configured ? "Configured ✓" : "Misconfigured ✗")}
        </Badge>
        
        {result.enabled && !result.configured && (
          <div className="mt-2">
            <div className="alert alert-danger">
              <small>
                Chainlink verifier is enabled but not properly configured. 
                {result.reason && <div>Reason: {result.reason}</div>}
              </small>
            </div>
            <Button 
              variant="warning" 
              size="sm" 
              onClick={handleDisableChainlink}
            >
              Temporarily Disable Chainlink
            </Button>
            <div className="mt-1">
              <small>Only works if you're the contract owner.</small>
            </div>
          </div>
        )}
        
        {!result.enabled && (
          <div className="mt-2">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleEnableChainlink}
            >
              Re-enable Chainlink
            </Button>
          </div>
        )}
        
        {result.enabled && result.configured && (
          <div className="mt-1">
            <small>All Chainlink configuration looks good.</small>
          </div>
        )}
      </div>
    );
  };

  return (
    <Accordion className="mt-4">
      <Accordion.Item eventKey="0">
        <Accordion.Header>
          <span>Submission Diagnostics</span>
        </Accordion.Header>
        <Accordion.Body>
          <p className="text-muted">
            If you're having trouble submitting your assessment, use this diagnostic tool to identify and fix potential issues.
          </p>
          
          {error && (
            <div className="alert alert-danger mb-3">
              {error}
            </div>
          )}
          
          <Button 
            variant="primary"
            onClick={runDiagnostics}
            disabled={isRunning}
            className="mb-3"
          >
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
          
          {bypassStatus && bypassStatus.message && (
            <div className={`alert ${bypassStatus.success ? 'alert-success' : bypassStatus.isSubmitting ? 'alert-info' : 'alert-warning'} mt-3`}>
              <strong>{bypassStatus.isSubmitting ? 'Submitting...' : (bypassStatus.success ? 'Success:' : 'Error:')}</strong> {bypassStatus.message}
              {bypassStatus.txHash && (
                <div className="mt-2">
                  <small>Transaction: {bypassStatus.txHash}</small>
                </div>
              )}
            </div>
          )}
          
          {/* Always show the direct "Submit with Chainlink Bypass" button once diagnostics have been run */}
          {results.verifier && (
            <div className="mt-3 mb-4 p-3" style={{ border: '2px solid #ece16a', borderRadius: '8px', backgroundColor: '#fffeed' }}>
              <h5 className="text-center mb-3">💡 Fast-Track Submission</h5>
              <p>
                <strong>Having trouble with submission?</strong> You can use this button to bypass Chainlink verification 
                and submit directly to the blockchain. This is useful when:
              </p>
              <ul>
                <li>Your submission is failing with "Source code not set" errors</li>
                <li>You need to quickly submit for your hackathon demo</li>
                <li>The Chainlink verifier is misconfigured or not properly set up</li>
              </ul>
              <div className="d-grid">
                <Button 
                  variant="warning" 
                  size="lg"
                  onClick={handleBypassChainlinkSubmit}
                  disabled={bypassStatus && bypassStatus.isSubmitting}
                  className="mt-2"
                  style={{ fontSize: '1.1rem' }}
                >
                  {bypassStatus && bypassStatus.isSubmitting ? 
                    <><Spinner animation="border" size="sm" className="me-2" />Processing...</> : 
                    '🚀 Submit with Chainlink Bypass'}
                </Button>
              </div>
              <div className="text-center mt-2">
                <small className="text-muted">Note: This works best if you're the contract owner or admin</small>
              </div>
            </div>
          )}
          
          {/* If there's a specific verification issue, show additional context */}
          {results.verifier && results.verifier.enabled && !results.verifier.configured && (
            <div className="mt-3 alert alert-warning">
              <strong>📢 Chainlink Verification Issue Detected</strong>
              <p>Your submission is likely failing because the Chainlink verifier is not properly configured.</p>
              {results.verifier.reason && <p><strong>Specific reason:</strong> {results.verifier.reason}</p>}
              <p>We recommend using the "Submit with Chainlink Bypass" button above.</p>
            </div>
          )}
          
          <Card className="mt-3">
            <Card.Body>
              {questionSetStatus()}
              {assessmentStatus()}
              {verifierStatus()}
            </Card.Body>
          </Card>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default DiagnosticPanel; 