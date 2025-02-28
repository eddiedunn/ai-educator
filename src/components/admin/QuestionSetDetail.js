import React, { useState, useEffect } from 'react';
import { Card, Button, ListGroup, Badge, Alert, Modal, Spinner } from 'react-bootstrap';
import { ethers } from 'ethers';

const QuestionSetDetail = ({ questionSetId, onClose, questionManager }) => {
  const [questionSet, setQuestionSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuestionSet();
  }, [questionSetId]);

  const fetchQuestionSet = async () => {
    setLoading(true);
    setError(null);

    try {
      // First check if it's a committed question set
      let onChainQuestionSet = null;
      if (questionManager) {
        try {
          // Use the questionSets mapping instead of getQuestionSet
          const questionSetData = await questionManager.questionSets(questionSetId);
          if (questionSetData && questionSetData.setId) {
            onChainQuestionSet = {
              id: questionSetData.setId,
              contentHash: questionSetData.contentHash,
              questionCount: questionSetData.questionCount.toNumber(),
              timestamp: questionSetData.timestamp.toNumber(),
              active: questionSetData.active,
              exists: true,
              onChain: true
            };
          }
        } catch (error) {
          console.warn("Question set not found on chain:", error);
        }
      }

      // Check local storage for full details
      const localSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
      const localSet = localSets.find(set => set.id === questionSetId);
      
      if (localSet) {
        // Combine data from blockchain and local storage
        setQuestionSet({
          ...localSet,
          onChain: !!onChainQuestionSet,
          blockchain: onChainQuestionSet || {}
        });
      } else if (onChainQuestionSet) {
        // Only blockchain data is available
        setQuestionSet({
          ...onChainQuestionSet,
          questions: [],
          message: "This question set is on the blockchain, but full details are not available locally."
        });
      } else {
        throw new Error("Question set not found");
      }
    } catch (error) {
      console.error("Error fetching question set:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal show={true} onHide={onClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Loading Question Set</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <p className="mt-3">Loading question set details...</p>
        </Modal.Body>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal show={true} onHide={onClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            {error}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  if (!questionSet) {
    return (
      <Modal show={true} onHide={onClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Question Set Not Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            The question set with ID "{questionSetId}" could not be found.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <Modal show={true} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Question Set: {questionSet.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card className="mb-4">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Details</h5>
              {questionSet.onChain && (
                <Badge bg="success">On Blockchain</Badge>
              )}
            </div>
          </Card.Header>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>ID:</strong> {questionSet.id}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Question Count:</strong> {questionSet.questionCount}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Content Hash:</strong> <small className="text-muted">{questionSet.contentHash}</small>
            </ListGroup.Item>
            {questionSet.timestamp && (
              <ListGroup.Item>
                <strong>Created:</strong> {new Date(questionSet.timestamp).toLocaleString()}
              </ListGroup.Item>
            )}
            {questionSet.message && (
              <ListGroup.Item>
                <Alert variant="info" className="mb-0">
                  {questionSet.message}
                </Alert>
              </ListGroup.Item>
            )}
          </ListGroup>
        </Card>

        {questionSet.questions && questionSet.questions.length > 0 ? (
          <div>
            <h5>Questions ({questionSet.questions.length})</h5>
            {questionSet.questions.map((question, index) => (
              <Card key={question.id} className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Question {index + 1}</h6>
                </Card.Header>
                <Card.Body>
                  <p><strong>Text:</strong> {question.questionText}</p>
                  <p><strong>Answer Hash:</strong> <small className="text-muted">{question.answerHash}</small></p>
                  {question.explanation && (
                    <p><strong>Explanation:</strong> {question.explanation}</p>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        ) : (
          <Alert variant="info">
            No detailed question data available for this question set.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuestionSetDetail; 