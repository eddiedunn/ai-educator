import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AvailableQuestionSets = ({ questionManager }) => {
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AvailableQuestionSets mounted. questionManager:", questionManager ? "Connected" : "Not connected");
    
    if (questionManager) {
      console.log("Question Manager Address:", questionManager.address);
      fetchQuestionSets();
    } else {
      console.warn("No questionManager provided to AvailableQuestionSets component");
      setLoading(false);
    }
  }, [questionManager]);

  const fetchQuestionSets = async () => {
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
  };

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
      <Card className="mb-4 available-question-sets">
        <Card.Header as="h5">Available Question Sets</Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <p className="mt-3">Loading available question sets...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4 available-question-sets">
      <Card.Header as="h5">Available Question Sets</Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {questionSets.length === 0 ? (
          <Alert variant="info">
            <p>No question sets are currently available. Please check back later.</p>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="mt-2" 
              onClick={fetchQuestionSets}
            >
              Refresh Question Sets
            </Button>
          </Alert>
        ) : (
          <>
            <div className="mb-3">
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={fetchQuestionSets}
              >
                Refresh Question Sets
              </Button>
            </div>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Questions</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionSets.map(set => (
                  <tr key={set.id}>
                    <td>{set.id}</td>
                    <td>{set.questionCount}</td>
                    <td>
                      {set.timestamp ? (
                        new Date(set.timestamp * 1000).toLocaleDateString()
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default AvailableQuestionSets; 