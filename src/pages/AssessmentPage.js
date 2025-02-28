import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Form, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { retrieveQuestionSet, submitAnswersToBlockchain } from '../utils/answerStorage';
import { debugLog, isDebugMode } from '../utils/debug';
import { evaluateWithOpenAI } from '../utils/llmEvaluator';

const AssessmentPage = ({ questionManager }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [questionSetData, setQuestionSetData] = useState(null);
  const [contentHash, setContentHash] = useState(null);
  const [startingAssessment, setStartingAssessment] = useState(false);

  useEffect(() => {
    if (!questionManager) {
      setError("Question Manager contract not connected");
      setLoading(false);
      return;
    }

    // Load the assessment data
    loadAssessment();
  }, [questionManager, id]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      debugLog(`Loading assessment for question set ID: ${id}`);

      // Get question set data from the contract
      const contractQuestionSet = await questionManager.questionSets(id);
      setQuestionSetData(contractQuestionSet);
      
      debugLog("Question set data from contract:", contractQuestionSet);
      
      if (!contractQuestionSet || !contractQuestionSet.active) {
        throw new Error("Question set not found or not active");
      }

      // Check if user already has an active assessment
      try {
        const userAddress = await questionManager.signer.getAddress();
        const userAssessment = await questionManager.userAssessments(userAddress);
        
        // If the user doesn't have an active assessment, we'll need to request one
        if (!userAssessment.active) {
          debugLog("No active assessment found for user. Will request one during submission.");
        } else {
          debugLog("User has an active assessment:", userAssessment);
        }
      } catch (err) {
        debugLog("Error checking user assessment:", err);
      }

      // Load question content from storage (IPFS in a real implementation)
      // For now, this creates mock questions based on the ID
      const { questionSet, contentHash: qsContentHash } = await retrieveQuestionSet(id);
      debugLog("Question set content:", questionSet);
      debugLog("Content hash:", qsContentHash);
      debugLog(`Loaded ${questionSet.questions.length} questions`);
      
      setQuestions(questionSet.questions);
      setContentHash(qsContentHash);
      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment:", error);
      setError(`Failed to load assessment: ${error.message}`);
      setLoading(false);
    }
  };

  const handleTextAnswerChange = (questionId, text) => {
    setAnswers({
      ...answers,
      [questionId]: text
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
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

      // Check if user has an active assessment or needs to request one
      setStartingAssessment(true);
      
      try {
        // Get user assessment status
        const userAddress = await questionManager.signer.getAddress();
        const userAssessment = await questionManager.userAssessments(userAddress);
        
        if (!userAssessment.active) {
          debugLog("User has no active assessment. Requesting one...");
          // Will be handled in submitAnswersToBlockchain
        }
      } catch (error) {
        debugLog("Error checking assessment status:", error);
      }
      
      setStartingAssessment(false);

      // Format answers into an array for submission
      const answerArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || ''
      }));
      
      debugLog("Submitting free-text answers:", answerArray);
      debugLog(`Total questions: ${questions.length}, answers submitted: ${answerArray.length}`);

      // Submit answers to the blockchain
      try {
        await submitAnswersToBlockchain(questionManager, id, answerArray);
        debugLog("Answers submitted successfully");
        
        setAssessmentComplete(true);
      } catch (error) {
        console.error("Error submitting to blockchain:", error);
        
        // Check if it's the "No active assessment" error
        if (error.message.includes("No active assessment")) {
          setError("Failed to start assessment. Please try refreshing the page and starting again.");
        } else {
          setError(`Blockchain submission failed: ${error.message}. Please try again.`);
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

  const handleReturnToMain = () => {
    navigate('/');
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
      <Alert variant="danger" className="my-4">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        
        {isDebugMode() && (
          <div className="mt-3 border-top pt-2">
            <h6 className="text-muted">Debug Information:</h6>
            <ul className="small">
              <li>Question Set ID: {id}</li>
              <li>Content Hash: {contentHash ? `${contentHash.substring(0, 10)}...` : 'None'}</li>
              <li>Questions Loaded: {questions.length}</li>
              <li>Contract Connected: {questionManager ? 'Yes' : 'No'}</li>
            </ul>
            <p className="small text-muted">
              Debug mode is enabled. Set REACT_APP_ENABLE_DEBUG=false in .env to disable.
            </p>
          </div>
        )}
        
        <div className="d-flex justify-content-end">
          <Button variant="outline-danger" onClick={handleReturnToMain}>
            Return to Dashboard
          </Button>
        </div>
      </Alert>
    );
  }

  if (assessmentComplete) {
    return (
      <Card className="my-4">
        <Card.Header as="h4" className="bg-success text-white">Assessment Complete</Card.Header>
        <Card.Body className="text-center">
          <Card.Title>Thank you for completing the assessment!</Card.Title>
          <Card.Text>
            Your answers have been submitted successfully. They will be evaluated by an AI system, and results will be processed on the blockchain.
          </Card.Text>
          <Card.Text className="text-muted">
            The evaluation process may take a few minutes. You can check your results on the dashboard once processing is complete.
          </Card.Text>
          <Button variant="primary" onClick={handleReturnToMain}>
            Return to Dashboard
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
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
        label={`${currentQuestion + 1} of ${questions.length}`} 
        className="mb-4" 
      />
      
      {questions.length > 0 && (
        <Card>
          <Card.Header as="h5">Question {currentQuestion + 1}</Card.Header>
          <Card.Body>
            <Card.Text>{questions[currentQuestion].text}</Card.Text>
            
            <Form>
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Enter your answer here..."
                  value={answers[questions[currentQuestion].id] || ''}
                  onChange={(e) => handleTextAnswerChange(questions[currentQuestion].id, e.target.value)}
                />
                <Form.Text className="text-muted">
                  Your response will be evaluated by an AI system. Provide a thorough explanation to demonstrate your understanding.
                </Form.Text>
              </Form.Group>
            </Form>
            
            <div className="d-flex justify-content-between mt-4">
              <Button 
                variant="secondary" 
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 0}
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
                  disabled={!answers[questions[currentQuestion].id] || answers[questions[currentQuestion].id].trim() === ''}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  variant="success" 
                  onClick={handleSubmitAssessment}
                  disabled={submitting || !answers[questions[currentQuestion].id] || answers[questions[currentQuestion].id].trim() === ''}
                >
                  {submitting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Submitting...
                    </>
                  ) : (
                    'Submit Assessment'
                  )}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default AssessmentPage; 