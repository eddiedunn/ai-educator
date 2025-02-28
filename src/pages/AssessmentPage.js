import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Form, Alert, Spinner, ProgressBar, Container, Row, Col } from 'react-bootstrap';
import { retrieveQuestionSet, submitAnswersToBlockchain, storeAnswers } from '../utils/answerStorage';
import { debugLog, isDebugMode } from '../utils/debug';
import { evaluateWithOpenAI } from '../utils/llmEvaluator';
import { Link } from 'react-router-dom';
import { metaMaskHooks } from '../utils/connectors';
import { ethers } from 'ethers';
import { activateInjectedConnector } from '../utils/connectors';

const { useAccounts, useProvider, useChainId } = metaMaskHooks;

const AssessmentPage = ({ questionManager }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [contentHash, setContentHash] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [message, setMessage] = useState(null);
  const [questionSetData, setQuestionSetData] = useState(null);
  
  // Use metaMask hooks
  const accounts = useAccounts();
  const account = accounts?.[0];
  const provider = useProvider();
  const chainId = useChainId();

  useEffect(() => {
    // Ensure wallet is connected
    if (!account) {
      activateInjectedConnector().then(success => {
        if (!success) {
          setError("Failed to connect wallet. Please connect your wallet manually.");
        }
      });
    }

    if (!questionManager) {
      setError("Question Manager contract not connected");
      setLoading(false);
      return;
    }

    // Load the assessment data
    loadAssessment();
  }, [questionManager, id, account]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      debugLog(`Loading assessment for question set ID: ${id}`);
      console.log('Starting to load assessment for question set ID:', id);

      // Get question set data from the contract
      const contractQuestionSet = await questionManager.questionSets(id);
      setQuestionSetData(contractQuestionSet);
      
      debugLog("Question set data from contract:", contractQuestionSet);
      console.log('Contract question set data:', contractQuestionSet);
      
      if (!contractQuestionSet || !contractQuestionSet.active) {
        throw new Error("Question set not found or not active");
      }

      // Load question content from storage (IPFS in a real implementation)
      // For now, this creates mock questions based on the ID
      const { questionSet, contentHash: qsContentHash } = await retrieveQuestionSet(id);
      debugLog("Question set content:", questionSet);
      debugLog("Content hash:", qsContentHash);
      debugLog(`Loaded ${questionSet.questions.length} questions`);
      console.log('Loaded questions:', questionSet.questions);
      
      setQuestions(questionSet.questions);
      setContentHash(qsContentHash);
      console.log('Setting loading to false');
      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment:", error);
      setError(`Failed to load assessment: ${error.message}`);
      setLoading(false);
    }
  };

  const handleReturnToMain = () => {
    navigate('/');
  };

  const handleAnswerChange = (e, questionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: e.target.value
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitAssessment = async () => {
    try {
      setSubmitting(true);
      
      // Check if all questions have been answered
      const unansweredQuestions = questions.filter(q => 
        !answers[q.id] || answers[q.id].trim() === ''
      );
      
      if (unansweredQuestions.length > 0) {
        alert(`Please answer all questions before submitting. You have ${unansweredQuestions.length} unanswered questions.`);
        setSubmitting(false);
        return;
      }

      // Format answers into an array for submission
      const answerArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || ''
      }));
      
      debugLog("Submitting free-text answers:", answerArray);
      debugLog(`Total questions: ${questions.length}, answers submitted: ${answerArray.length}`);

      // First store the answers to get a hash
      try {
        // Store answers and get the hash
        const { answersHash } = await storeAnswers(id, answerArray);
        debugLog("Generated answers hash:", answersHash);
        
        // Submit answer hash to the blockchain
        await submitAnswersToBlockchain(questionManager, id, answersHash);
        debugLog("Answers submitted successfully");
        
        setAssessmentComplete(true);
        setMessage({
          type: 'success',
          text: 'Your answers have been submitted successfully and are being evaluated. Results will be available soon!'
        });
      } catch (error) {
        console.error("Error submitting to blockchain:", error);
        
        if (error.message.includes('cancelled by user')) {
          // User canceled the transaction
          setMessage({
            type: 'warning',
            text: error.message || 'Transaction was cancelled. Please try again when you are ready to proceed.'
          });
        } else if (error.message.includes('already completed')) {
          // User already completed this assessment
          setMessage({
            type: 'warning',
            text: 'You have already completed this assessment. Please choose a different question set.'
          });
        } else if (error.message.includes('nonce') || error.message.includes('transaction') || error.message.includes('sync')) {
          // Handle nonce errors with more detailed guidance
          setMessage({
            type: 'warning',
            text: `Transaction nonce error: Your wallet is out of sync with the blockchain. Please try: 
            1. Click the "Check Transaction Count" button below for diagnosis
            2. Reset your wallet's account activity (Settings > Advanced)
            3. Refresh this page and try again
            4. If issues persist, please restart your browser and the Hardhat node`
          });
          
          // Add a debug button if not already in debug mode
          if (!isDebugMode()) {
            console.error('Nonce error details:', error);
            console.log('To resolve nonce issues, enable debug mode in .env (REACT_APP_ENABLE_DEBUG=true)');
          }
        } else {
          // General error
          setMessage({
            type: 'error',
            text: `Error submitting answers: ${error.message}`
          });
        }
      }
      
      setSubmitting(false);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setError(`Failed to submit assessment: ${error.message}`);
      setSubmitting(false);
    }
  };

  // Add function to test OpenAI evaluation
  const handleTestEvaluation = async () => {
    try {
      if (!isDebugMode()) return;
      
      setSubmitting(true);
      debugLog('Testing OpenAI evaluation...');
      
      // Get the current question and answer
      const currentQ = questions[currentQuestion];
      const currentA = answers[currentQ.id] || '';
      
      // Call the OpenAI evaluator directly
      const result = await evaluateWithOpenAI(currentQ, currentA);
      
      // Show the result in an alert for testing
      alert(`Evaluation Result:\nScore: ${result.score}\nFeedback: ${result.feedback}`);
      
    } catch (error) {
      console.error('Error testing evaluation:', error);
      alert(`Error testing evaluation: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading assessment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="mb-4">
          <strong>Error:</strong> {error}
          <div className="mt-3">
            <Button 
              variant="outline-primary" 
              as={Link} 
              to="/"
            >
              Return to Dashboard
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // Main content
  return (
    <Container className="mt-4">
      {message && (
        <Alert variant={message.type} className="mb-4">
          {message.text}
        </Alert>
      )}

      {assessmentComplete ? (
        <Card>
          <Card.Body>
            <Card.Title>Thank you for completing the assessment!</Card.Title>
            {message && message.type === 'success' ? (
              <Card.Text>
                Your answers have been submitted successfully. They will be evaluated by an AI system, and results will be processed on the blockchain.
              </Card.Text>
            ) : (
              <Card.Text>
                {message ? message.text : 'Your answers have been submitted for processing.'}
              </Card.Text>
            )}
            <Card.Text className="text-muted">
              You may close this page and check your results later from the dashboard.
            </Card.Text>
            <Button variant="primary" as={Link} to="/">
              Return to Dashboard
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <div className="my-4">
          <h2 className="mb-4">Assessment: Question Set #{id}</h2>
          
          {questionSetData && (
            <div className="mb-4">
              <p><strong>Questions:</strong> {questionSetData.questionCount.toString()}</p>
              <Alert variant="info">
                <Alert.Heading>Free-Form Assessment</Alert.Heading>
                <p>
                  This assessment uses free-form text responses. Your answers will be evaluated by an AI system that analyzes your understanding of the concepts.
                </p>
                <p className="mb-0">
                  Please provide detailed, thoughtful responses to demonstrate your knowledge.
                </p>
              </Alert>
            </div>
          )}
          
          <ProgressBar 
            now={(currentQuestion + 1) / questions.length * 100} 
            className="mb-4"
            label={`Question ${currentQuestion + 1} of ${questions.length}`}
          />
          
          {questions.length > 0 && (
            <Card>
              <Card.Body>
                <Card.Title>Question {currentQuestion + 1}</Card.Title>
                <Card.Text>{questions[currentQuestion].text}</Card.Text>
                
                <Form.Group className="mb-4">
                  <Form.Control
                    as="textarea"
                    rows={5}
                    placeholder="Enter your answer here..."
                    value={answers[questions[currentQuestion].id] || ''}
                    onChange={(e) => handleAnswerChange(e, questions[currentQuestion].id)}
                    disabled={submitting}
                  />
                </Form.Group>
                
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary" 
                    onClick={handlePrevQuestion}
                    disabled={currentQuestion === 0 || submitting}
                  >
                    Previous
                  </Button>
                  
                  {/* Add test evaluation button when in debug mode */}
                  {isDebugMode() && (
                    <Button
                      variant="info"
                      onClick={handleTestEvaluation}
                      disabled={submitting || !answers[questions[currentQuestion].id]}
                    >
                      Test Evaluation
                    </Button>
                  )}
                  
                  {currentQuestion < questions.length - 1 ? (
                    <Button 
                      variant="primary" 
                      onClick={handleNextQuestion}
                      disabled={submitting}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      variant="success" 
                      onClick={handleSubmitAssessment}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />{' '}
                          Submitting...
                        </>
                      ) : 'Submit Assessment'}
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </Container>
  );
};

export default AssessmentPage; 
