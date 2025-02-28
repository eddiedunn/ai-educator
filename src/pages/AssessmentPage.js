import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Form, Alert, Spinner, ProgressBar } from 'react-bootstrap';

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
      console.log(`Loading assessment for question set ID: ${id}`);

      // Get question set data from the contract
      const questionSet = await questionManager.questionSets(id);
      setQuestionSetData(questionSet);
      
      console.log("Question set data:", questionSet);
      
      if (!questionSet || !questionSet.active) {
        throw new Error("Question set not found or not active");
      }

      // In a real implementation, you would fetch the questions from IPFS using the contentHash
      // For now, we'll create sample free-form questions
      const sampleQuestions = [];
      for (let i = 0; i < questionSet.questionCount; i++) {
        sampleQuestions.push({
          id: i,
          text: `Question ${i + 1}: Explain the concept of ${getRandomTopic(i)} in your own words.`,
          type: 'free-text'
        });
      }
      
      setQuestions(sampleQuestions);
      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment:", error);
      setError(`Failed to load assessment: ${error.message}`);
      setLoading(false);
    }
  };

  // Helper function to generate random topics for sample questions
  const getRandomTopic = (index) => {
    const topics = [
      'blockchain consensus mechanisms',
      'smart contract security',
      'decentralized finance (DeFi)',
      'non-fungible tokens (NFTs)',
      'layer 2 scaling solutions',
      'Web3 architecture',
      'token economics',
      'decentralized autonomous organizations (DAOs)',
      'zero-knowledge proofs',
      'cross-chain interoperability'
    ];
    return topics[index % topics.length];
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

      // Prepare answers for submission
      const answerArray = questions.map((q) => answers[q.id] || '');
      console.log("Submitting free-text answers:", answerArray);

      // In a real implementation, you would call the contract to submit answers
      // The answers would be sent to an LLM for evaluation
      // await questionManager.submitAnswers(id, answerArray);
      
      // Mock submission delay (would be replaced with actual blockchain transaction)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAssessmentComplete(true);
      setSubmitting(false);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setError(`Failed to submit assessment: ${error.message}`);
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