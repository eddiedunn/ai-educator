import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AvailableQuestionSets = ({ questionManager }) => {
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  const fetchQuestionSets = useCallback(async () => {
    console.log("Fetching question sets...");
    setLoading(true);
    setError(null);

    try {
      // Get active question sets from the contract
      const sets = [];
      
      try {
        // Try to get all active question sets using the contract function
        console.log("Attempting primary method: getActiveQuestionSets()");
        const activeSetIds = await questionManager.getActiveQuestionSets();
        console.log("Active question set IDs:", activeSetIds);
        
        // Fetch each question set's metadata
        for (const id of activeSetIds) {
          try {
            console.log(`Fetching question set data for ID: ${id}`);
            const questionSetData = await questionManager.questionSets(id);
            console.log(`Question set data for ${id}:`, questionSetData);
            
            if (questionSetData && questionSetData.setId) {
              sets.push({
                id: questionSetData.setId,
                contentHash: questionSetData.contentHash,
                questionCount: questionSetData.questionCount.toNumber(),
                timestamp: questionSetData.timestamp.toNumber(),
                active: questionSetData.active
              });
            }
          } catch (error) {
            console.error(`Error fetching question set ${id}:`, error);
          }
        }
      } catch (error) {
        console.error("Error getting active question sets:", error);
        
        // Fallback: Try to get all question sets and filter for active ones
        console.log("Attempting fallback method: Iterate through all question sets");
        try {
          // Get all question set IDs
          const questionSetIds = [];
          let index = 0;
          let continueLoop = true;
          
          // Loop through the questionSetIds array until we hit an error
          console.log("Fetching all question set IDs");
          while (continueLoop) {
            try {
              const id = await questionManager.questionSetIds(index);
              console.log(`Found ID at index ${index}:`, id);
              questionSetIds.push(id);
              index++;
            } catch (e) {
              // We've reached the end of the array
              console.log(`End of question set IDs reached at index ${index}`);
              continueLoop = false;
            }
          }
          
          console.log("All question set IDs:", questionSetIds);
          
          // Fetch each question set by ID
          for (const id of questionSetIds) {
            try {
              // Get the question set metadata from the contract
              console.log(`Fetching data for question set ID: ${id}`);
              const questionSetData = await questionManager.questionSets(id);
              console.log(`Data for ${id}:`, questionSetData);
              
              // Only include active sets
              if (questionSetData && questionSetData.active) {
                sets.push({
                  id: questionSetData.setId,
                  contentHash: questionSetData.contentHash,
                  questionCount: questionSetData.questionCount.toNumber(),
                  timestamp: questionSetData.timestamp.toNumber(),
                  active: questionSetData.active
                });
              } else {
                console.log(`Skipping inactive question set: ${id}`);
              }
            } catch (error) {
              console.error(`Error fetching question set ${id}:`, error);
            }
          }
        } catch (fallbackError) {
          console.error("Fallback method also failed:", fallbackError);
          throw new Error("Could not retrieve question sets");
        }
      }
      
      console.log("Final list of retrieved question sets:", sets);
      
      // Sort by timestamp (newest first)
      sets.sort((a, b) => b.timestamp - a.timestamp);
      
      setQuestionSets(sets);
    } catch (error) {
      console.error("Error fetching question sets:", error);
      setError("Failed to load available question sets: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [questionManager]);

  useEffect(() => {
    console.log("AvailableQuestionSets mounted. questionManager:", questionManager ? "Connected" : "Not connected");
    
    if (questionManager) {
      console.log("Question Manager Address:", questionManager.address);
      fetchQuestionSets();
    } else {
      console.warn("No questionManager provided to AvailableQuestionSets component");
      setLoading(false);
    }
  }, [questionManager, fetchQuestionSets]);

  const handleStartAssessment = async (questionSetId) => {
    try {
      setProcessingId(questionSetId);
      setError(null);
      console.log(`Starting assessment for question set: ${questionSetId}`);
      
      // First try to fetch the question set data to verify it exists
      const questionSetData = await questionManager.questionSets(questionSetId);
      console.log("Question set data:", questionSetData);
      
      if (!questionSetData || !questionSetData.active) {
        throw new Error("Question set not found or not active");
      }
      
      // Get questions from the IPFS hash (simulated for now)
      console.log("Content hash:", questionSetData.contentHash);
      
      // Store the selected question set ID in localStorage so we can access it on the assessment page
      localStorage.setItem('currentAssessmentId', questionSetId);
      
      // Redirect to assessment page
      navigate(`/assessment/${questionSetId}`);
      
    } catch (error) {
      console.error("Error starting assessment:", error);
      setError(`Failed to start assessment: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && questionSets.length === 0) {
    return (
      <div className="mt-5">
        <h1 className="text-center mb-4">Available Assessments</h1>
        <Card className="mb-4 available-question-sets shadow">
          <Card.Header as="h5">Loading Assessments</Card.Header>
          <Card.Body className="text-center py-5">
            <Spinner animation="border" role="status" />
            <p className="mt-3">Loading available assessments...</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <h1 className="text-center mb-4">Available Assessments</h1>
      <Card className="mb-4 available-question-sets shadow">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Assessment Catalog</h5>
          {questionSets.length > 0 && (
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={fetchQuestionSets}
            >
              Refresh Assessments
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {questionSets.length === 0 ? (
            <Alert variant="info">
              <p>No assessments are currently available. Please check back later.</p>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="mt-2" 
                onClick={fetchQuestionSets}
              >
                Refresh Assessments
              </Button>
            </Alert>
          ) : (
            <Row xs={1} md={2} lg={3} className="g-3">
              {questionSets.map(set => (
                <Col key={set.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Header className="bg-primary text-white">
                      <h6 className="mb-0 text-truncate" title={set.id}>
                        {set.id}
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Card.Text>
                        <strong>Questions:</strong> {set.questionCount}
                        <br />
                        <strong>Created:</strong> {set.timestamp ? new Date(set.timestamp * 1000).toLocaleDateString() : "N/A"}
                      </Card.Text>
                      <div className="d-grid gap-2">
                        <Button
                          variant="primary"
                          onClick={() => handleStartAssessment(set.id)}
                          disabled={processingId === set.id}
                        >
                          {processingId === set.id ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-1"
                              />
                              Loading...
                            </>
                          ) : (
                            "Start Assessment"
                          )}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AvailableQuestionSets; 