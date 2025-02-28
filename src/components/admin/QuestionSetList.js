import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { ethers } from 'ethers';
import QuestionSetDetail from './QuestionSetDetail';

const QuestionSetList = ({ questionManager, refreshCounter, onQuestionSetUpdated }) => {
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commitLoading, setCommitLoading] = useState({});
  const [selectedQuestionSet, setSelectedQuestionSet] = useState(null);

  useEffect(() => {
    fetchQuestionSets();
  }, [refreshCounter, questionManager]);

  const fetchQuestionSets = async () => {
    setLoading(true);
    setError(null);

    try {
      // Combine data from blockchain and local storage
      const sets = [];
      
      // Fetch question sets from local storage
      const localSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
      
      // Fetch question set IDs from blockchain if contract is available
      if (questionManager) {
        try {
          // Get all question set IDs from the questionSetIds array in the contract
          const questionSetIds = [];
          let index = 0;
          let continueLoop = true;
          
          // Loop through the questionSetIds array until we hit an error
          while (continueLoop) {
            try {
              const id = await questionManager.questionSetIds(index);
              questionSetIds.push(id);
              index++;
            } catch (e) {
              // We've reached the end of the array
              continueLoop = false;
            }
          }
          
          // Fetch each question set by ID
          for (const id of questionSetIds) {
            // Get the question set metadata from the contract
            const questionSetData = await questionManager.questionSets(id);
            
            // Check if we have local data for this question set
            const localSet = localSets.find(set => set.id === id);
            
            if (localSet) {
              // Add blockchain flag to local set
              sets.push({
                ...localSet,
                onChain: true
              });
            } else {
              // Add blockchain-only data
              sets.push({
                id: questionSetData.setId,
                contentHash: questionSetData.contentHash,
                questionCount: questionSetData.questionCount.toNumber(),
                timestamp: questionSetData.timestamp.toNumber(),
                active: questionSetData.active,
                onChain: true
              });
            }
          }
        } catch (error) {
          console.error("Error fetching question sets from blockchain:", error);
          setError("Error fetching question sets from blockchain: " + error.message);
        }
      }
      
      // Add any local sets that aren't already in our list
      localSets.forEach(localSet => {
        if (!sets.some(set => set.id === localSet.id)) {
          sets.push({
            ...localSet,
            onChain: false
          });
        }
      });
      
      // Sort by timestamp (newest first) or ID if no timestamp
      sets.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return a.id.localeCompare(b.id);
      });
      
      setQuestionSets(sets);
    } catch (error) {
      console.error("Error fetching question sets:", error);
      setError("Failed to load question sets: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuestionSet = (id) => {
    setSelectedQuestionSet(id);
  };

  const handleDeleteQuestionSet = (id) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the question set "${id}"?`);
    
    if (confirmDelete) {
      try {
        // Get current sets from local storage
        const localSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
        
        // Filter out the one to delete
        const updatedSets = localSets.filter(set => set.id !== id);
        
        // Save back to local storage
        localStorage.setItem('questionSets', JSON.stringify(updatedSets));
        
        // Update state
        setQuestionSets(prev => prev.filter(set => set.id !== id));
        
        // Notify parent
        if (onQuestionSetUpdated) {
          onQuestionSetUpdated();
        }
      } catch (error) {
        console.error("Error deleting question set:", error);
        setError("Failed to delete question set: " + error.message);
      }
    }
  };

  const handleCommitToBlockchain = async (id) => {
    setCommitLoading(prev => ({ ...prev, [id]: true }));
    setError(null);
    
    try {
      // Get question set from local storage
      const localSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
      const questionSet = localSets.find(set => set.id === id);
      
      if (!questionSet) {
        throw new Error("Question set not found in local storage");
      }
      
      if (!questionManager) {
        throw new Error("QuestionManager contract not available");
      }
      
      // Submit to blockchain using correct method from contract
      const tx = await questionManager.submitQuestionSetHash(
        questionSet.id,
        questionSet.contentHash,
        questionSet.questionCount
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Update the local storage entry to mark it as on-chain
      const updatedLocalSets = localSets.map(set => 
        set.id === id ? { ...set, onChain: true } : set
      );
      localStorage.setItem('questionSets', JSON.stringify(updatedLocalSets));
      
      // Update state to show it's on the blockchain
      setQuestionSets(prev => 
        prev.map(set => 
          set.id === id ? { ...set, onChain: true } : set
        )
      );
      
      // Notify parent
      if (onQuestionSetUpdated) {
        onQuestionSetUpdated();
      }
    } catch (error) {
      console.error("Error committing question set to blockchain:", error);
      setError(`Failed to commit "${id}" to blockchain: ${error.message}`);
    } finally {
      setCommitLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCloseDetail = () => {
    setSelectedQuestionSet(null);
  };

  if (loading && questionSets.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header as="h5">Question Sets</Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <p className="mt-3">Loading question sets...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <Card.Header as="h5">Question Sets</Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {questionSets.length === 0 ? (
            <Alert variant="info">
              No question sets found. Create your first question set above.
            </Alert>
          ) : (
            <Row xs={1} md={2} lg={3} className="g-3">
              {questionSets.map(set => (
                <Col key={set.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <span className="text-truncate" style={{ maxWidth: '200px' }} title={set.id}>
                        {set.id}
                      </span>
                      {set.onChain ? (
                        <Badge bg="success">Blockchain</Badge>
                      ) : (
                        <Badge bg="warning">Local Only</Badge>
                      )}
                    </Card.Header>
                    <Card.Body>
                      <Card.Text>
                        <strong>Questions:</strong> {set.questionCount}
                        <br />
                        <strong>Created:</strong> {set.timestamp ? new Date(set.timestamp).toLocaleDateString() : "N/A"}
                      </Card.Text>
                    </Card.Body>
                    <Card.Footer>
                      <div className="d-flex gap-2 justify-content-between">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewQuestionSet(set.id)}
                        >
                          View
                        </Button>
                        
                        <div>
                          {!set.onChain && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-1"
                                onClick={() => handleCommitToBlockchain(set.id)}
                                disabled={commitLoading[set.id]}
                              >
                                {commitLoading[set.id] ? (
                                  <>
                                    <Spinner
                                      as="span"
                                      animation="border"
                                      size="sm"
                                      role="status"
                                      aria-hidden="true"
                                    />
                                    <span className="visually-hidden">Committing...</span>
                                  </>
                                ) : (
                                  "Commit"
                                )}
                              </Button>
                              
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteQuestionSet(set.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
      
      {selectedQuestionSet && (
        <QuestionSetDetail
          questionSetId={selectedQuestionSet}
          onClose={handleCloseDetail}
          questionManager={questionManager}
        />
      )}
    </>
  );
};

export default QuestionSetList; 