import React, { useState, useRef } from 'react';
import { Form, Button, Card, Alert, Spinner, Modal, ProgressBar, InputGroup, Badge, Tabs, Tab } from 'react-bootstrap';
import { ethers } from 'ethers';
import { getOpenAIApiKey } from '../../config';

const QuestionSetForm = ({ questionManager, onQuestionSetCreated }) => {
  // Form states
  const [name, setName] = useState('');
  const [sourceDocument, setSourceDocument] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiGenerationProgress, setAiGenerationProgress] = useState(0);
  const [commitToBlockchain, setCommitToBlockchain] = useState(false);
  const [fileUploadName, setFileUploadName] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiStatus, setAiStatus] = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef(null);
  
  // Using free-form text questions instead of multiple-choice
  const questionType = 'freeform';
  
  // AI prompt templates for different tasks (keeping for reference)
  const promptTemplates = {
    'freeform': `Generate {count} open-ended questions based on the following content. For each question, include the expected answer and a brief explanation.
    
Content: {document}

Format each question as:
Question: [question text]
Answer: [expected answer]
Explanation: [explanation]`
  };
  
  // Updated AI question generation with actual OpenAI API integration
  const generateQuestionsWithAI = async (document, count) => {
    setLoading(true);
    setAiGenerationProgress(0);
    setAiStatus('Analyzing document content...');
    
    try {
      setAiGenerationProgress(10);
      setAiStatus('Connecting to OpenAI API...');
      
      // Debug: Log all environment variables that start with REACT_APP
      console.log('Environment Variables:', Object.keys(process.env)
        .filter(key => key.startsWith('REACT_APP_'))
        .reduce((obj, key) => {
          obj[key] = key === 'REACT_APP_OPENAI_API_KEY' 
            ? (process.env[key] ? 'API KEY EXISTS' : 'API KEY MISSING') 
            : process.env[key];
          return obj;
        }, {})
      );
      
      // Get API key using our helper function (from config.js)
      const apiKey = getOpenAIApiKey();
      console.log('API Key exists:', !!apiKey);
      console.log('API Key starts with:', apiKey?.substring(0, 7));
      
      if (!apiKey) {
        throw new Error('OpenAI API key is missing. Please check your configuration or environment variables.');
      }
      
      // Clean the API key - remove any line breaks or whitespace
      const cleanApiKey = apiKey.replace(/\s+/g, '');
      
      setAiGenerationProgress(20);
      setAiStatus('Sending request to OpenAI...');
      
      // Using fetch to call OpenAI Chat Completions API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using GPT-4o-mini as requested
          messages: [
            {
              role: "system",
              content: "You are an educational content creator specialized in generating high-quality assessment questions."
            },
            {
              role: "user",
              content: `Generate ${count} open-ended questions based on the following content. For each question, include the expected answer and a brief explanation.
              
Content: ${document}

Format each question exactly as:
Question: [question text]
Answer: [expected answer]
Explanation: [explanation]`
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      setAiGenerationProgress(70);
      setAiStatus('Processing AI response...');
      
      // Parse the AI response and extract questions
      const aiResponseText = data.choices[0].message.content;
      const questionBlocks = aiResponseText.split(/Question:/).filter(block => block.trim().length > 0);
      
      const parsedQuestions = [];
      
      for (let i = 0; i < questionBlocks.length; i++) {
        setAiGenerationProgress(70 + ((i + 1) / questionBlocks.length) * 25);
        setAiStatus(`Processing question ${i+1} of ${questionBlocks.length}...`);
        
        try {
          const block = "Question:" + questionBlocks[i];
          
          // Extract question text
          const questionMatch = block.match(/Question:(.*?)(?=Answer:)/s);
          const questionText = questionMatch ? questionMatch[1].trim() : "";
          
          // Extract answer
          const answerMatch = block.match(/Answer:(.*?)(?=Explanation:)/s);
          const answerText = answerMatch ? answerMatch[1].trim() : "";
          
          // Extract explanation
          const explanationMatch = block.match(/Explanation:(.*?)(?=$|\n\s*Question:)/s);
          const explanation = explanationMatch ? explanationMatch[1].trim() : "";
          
          if (questionText && answerText) {
            parsedQuestions.push({
              id: `q${i+1}`,
              questionText,
              answerHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answerText)),
              answerText, // Keep the plain text answer for display purposes
              explanation
            });
          }
        } catch (parseError) {
          console.error(`Error parsing question ${i+1}:`, parseError);
        }
      }
      
      setAiGenerationProgress(100);
      setAiStatus('Question generation complete!');
      
      return parsedQuestions;
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error(`Failed to generate questions with AI: ${error.message}`);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setAiStatus('');
      }, 500);
    }
  };

  // Enhanced file upload handler with preview and more formats
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const fileType = file.type;
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['txt', 'md', 'pdf', 'docx'];
    
    if (!allowedTypes.includes(fileType) && !allowedExtensions.includes(fileExtension)) {
      setError('Please upload only text, markdown, PDF, or Word files (.txt, .md, .pdf, .docx)');
      return;
    }

    setFileUploadName(fileName);

    // For PDF and Word files in a real app, you would send to backend for processing
    if (fileExtension === 'pdf' || fileExtension === 'docx') {
      // Simulate processing of PDF/DOCX
      setLoading(true);
      setAiStatus('Processing document...');
      
      setTimeout(() => {
        // In a real app, this would contain the extracted text from the PDF/DOCX
        const extractedText = `Sample extracted text from ${fileName}.\n\nThis would contain the actual content extracted from your ${fileExtension.toUpperCase()} file using a document processing library on the backend.\n\nFor demonstration purposes, we're showing this placeholder text.`;
        
        setSourceDocument(extractedText);
        setFilePreview(extractedText.substring(0, 200) + '...');
        setLoading(false);
        setAiStatus('');
        
        // Suggest a name based on the file
        if (!name.trim()) {
          const suggestedName = fileName.split('.')[0];
          setName(suggestedName);
        }
      }, 1500);
      
      return;
    }

    // For text and markdown files
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setSourceDocument(content);
      setFilePreview(content.substring(0, 200) + '...');
      
      // Suggest a name based on the file
      if (!name.trim()) {
        const suggestedName = fileName.split('.')[0];
        setName(suggestedName);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file: ' + reader.error);
    };
    
    reader.readAsText(file);
  };

  // Clear file upload
  const handleClearFile = () => {
    setFileUploadName('');
    setSourceDocument('');
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add a dedicated function for blockchain submission with better error handling
  const submitToBlockchain = async (questionSet) => {
    if (!questionManager) {
      throw new Error('Question manager contract not connected');
    }
    
    setAiStatus('Preparing blockchain submission...');
    
    // Check if we're connected to the right network
    try {
      const network = await questionManager.provider.getNetwork();
      console.log("Connected to network:", network);
      
      // Get signer account
      const signer = await questionManager.signer.getAddress();
      console.log("Submitting from account:", signer);
      
      // Check if account has ETH balance
      const balance = await questionManager.provider.getBalance(signer);
      console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
      
      if (balance.eq(0)) {
        throw new Error('Your account has no ETH to pay for transaction fees');
      }
    } catch (error) {
      console.error("Network connection error:", error);
      throw new Error(`Network connection error: ${error.message}`);
    }
    
    try {
      setAiStatus('Submitting to blockchain...');
      
      // First check if this ID already exists
      try {
        const exists = await questionManager.questionSets(questionSet.id);
        if (exists.contentHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          throw new Error('A question set with this name already exists on the blockchain');
        }
      } catch (error) {
        // If the error isn't about the ID already existing, rethrow it
        if (!error.message.includes('already exists')) {
          console.error("Error checking if ID exists:", error);
        }
      }
      
      // Gas estimation
      let gasEstimate;
      try {
        gasEstimate = await questionManager.estimateGas.submitQuestionSetHash(
          questionSet.id,
          questionSet.contentHash,
          questionSet.questionCount
        );
        console.log("Gas estimate:", gasEstimate.toString());
      } catch (error) {
        console.error("Gas estimation failed:", error);
        
        // Try to extract more specific error
        if (error.error && error.error.message) {
          throw new Error(`Transaction will fail: ${error.error.message}`);
        } else if (error.message && error.message.includes("execution reverted")) {
          const revertMsg = error.message.split("execution reverted:")[1]?.trim() || "unknown reason";
          throw new Error(`Contract rejected transaction: ${revertMsg}`);
        } else {
          throw new Error(`Transaction will fail: ${error.message}`);
        }
      }
      
      // Execute transaction with higher gas limit for safety
      const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
      const tx = await questionManager.submitQuestionSetHash(
        questionSet.id,
        questionSet.contentHash,
        questionSet.questionCount,
        { gasLimit }
      );
      
      console.log("Transaction sent:", tx.hash);
      setAiStatus('Waiting for transaction confirmation...');
      
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      setAiStatus('Transaction confirmed!');
      
      return receipt;
    } catch (error) {
      console.error("Blockchain submission error:", error);
      
      // Format a user-friendly error message
      let errorMessage = "Failed to submit to blockchain";
      
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
        // Clean up common MetaMask error messages
        if (errorMessage.includes("Internal JSON-RPC error")) {
          errorMessage = "Contract rejected the transaction. Possible reasons: insufficient permissions, invalid inputs, or contract error";
        }
      }
      
      throw new Error(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate name (question set ID)
    const nameValue = name.trim();
    if (!nameValue) {
      setError('Please provide a name for the question set');
      return;
    }
    
    // Additional validation for question set ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(nameValue)) {
      setError('Question set name should only contain letters, numbers, underscores, and hyphens');
      return;
    }
    
    if (useAI && !sourceDocument.trim()) {
      setError('Please provide a source document for AI question generation');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let questionData = [];
      
      if (useAI) {
        // Generate questions with AI
        questionData = await generateQuestionsWithAI(sourceDocument, numberOfQuestions);
      } else {
        // Use manually entered questions
        questionData = questions;
      }
      
      if (!questionData || questionData.length === 0) {
        throw new Error('No questions were generated or provided');
      }
      
      // Calculate content hash from the full question set data
      const contentString = JSON.stringify(questionData);
      console.log("Content string length:", contentString.length);
      
      // Ensure we're creating a valid bytes32 hash
      let contentHash;
      try {
        contentHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(contentString)
        );
        console.log("Generated content hash:", contentHash);
        
        // Verify it's a valid bytes32 value
        if (!contentHash.startsWith('0x') || contentHash.length !== 66) {
          console.warn("Warning: Content hash may not be properly formatted:", contentHash);
        }
      } catch (error) {
        console.error("Error generating content hash:", error);
        setError(`Failed to generate content hash: ${error.message}`);
        setLoading(false);
        return;
      }
      
      // Create question set object
      const questionSet = {
        id: name,
        questionCount: questionData.length,
        contentHash,
        timestamp: Date.now(),
        questionType: useAI ? questionType : 'custom',
        sourceDocumentPreview: sourceDocument.substring(0, 200),
        questions: questionData
      };
      
      // If committing to blockchain immediately
      if (commitToBlockchain && questionManager) {
        try {
          await submitToBlockchain(questionSet);
          // Mark as on chain
          questionSet.onChain = true;
        } catch (error) {
          console.error("Error committing to blockchain:", error);
          setError(error.message);
          // Still save locally but mark as not on chain
          questionSet.onChain = false;
        }
      } else {
        // Not committing to blockchain now, mark as not on chain
        questionSet.onChain = false;
      }
      
      // Save to local storage in either case
      const existingSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
      localStorage.setItem('questionSets', JSON.stringify([...existingSets, questionSet]));
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setName('');
      setSourceDocument('');
      setFileUploadName('');
      setFilePreview('');
      setNumberOfQuestions(5);
      setQuestions([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      if (onQuestionSetCreated) {
        onQuestionSetCreated();
      }
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating question set:', error);
      setError(`Failed to create question set: ${error.message}`);
    } finally {
      setLoading(false);
      setAiStatus('');
    }
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: `q${questions.length + 1}`,
      questionText: '',
      answerHash: '',
      explanation: ''
    };
    
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    
    if (field === 'answer') {
      // Convert answer to hash
      updatedQuestions[index].answerHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(value)
      );
    } else {
      updatedQuestions[index][field] = value;
    }
    
    setQuestions(updatedQuestions);
  };

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
  };

  const handlePreview = async () => {
    if (useAI && sourceDocument.trim()) {
      try {
        const previewQuestions = await generateQuestionsWithAI(sourceDocument, numberOfQuestions);
        setQuestions(previewQuestions);
        setShowPreview(true);
      } catch (error) {
        setError(`Failed to generate preview: ${error.message}`);
      }
    } else if (!useAI && questions.length > 0) {
      setShowPreview(true);
    } else {
      setError('Please add questions or provide a source document for AI generation');
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">Create New Question Set</Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
            Question set created successfully!
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Question Set Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a unique name for this question set"
              disabled={loading}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>AI Configuration</Form.Label>
            <div className="d-flex align-items-center mb-2">
              <Form.Check
                type="switch"
                id="useAI"
                label="Use AI to generate questions"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                disabled={loading}
                className="me-3"
              />
              {useAI && (
                <Badge bg="info">Using GPT-4o-mini for question generation</Badge>
              )}
            </div>
          </Form.Group>
          
          {useAI ? (
            <>
              {/* AI Question Generation Options */}
              <div className="mb-3 p-3 border rounded bg-light">
                <h6>AI Generation Settings</h6>
                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Question Format</Form.Label>
                      <p className="mb-0 text-muted">
                        <Badge bg="primary" className="me-2">Free-form</Badge>
                        Questions will be generated in free-form text format
                      </p>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>AI Model</Form.Label>
                      <p className="mb-0 text-muted">
                        <Badge bg="info" className="me-2">GPT-4o-mini</Badge>
                        OpenAI's lightweight yet powerful model
                      </p>
                    </Form.Group>
                  </div>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Number of Questions</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="20"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                    disabled={loading}
                  />
                </Form.Group>
              </div>

              {/* Document Input Section */}
              <div className="mb-3">
                <h6>Source Document</h6>
                
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-3"
                >
                  <Tab eventKey="upload" title="Upload File">
                    <div className="p-3 border rounded">
                      <Form.Label>
                        Upload Document 
                        <Badge bg="info" className="ms-2">Supports .txt, .md, .pdf, .docx</Badge>
                      </Form.Label>
                      <InputGroup className="mb-3">
                        <Form.Control
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleFileUpload}
                          disabled={loading}
                        />
                        {fileUploadName && (
                          <Button 
                            variant="outline-secondary"
                            onClick={handleClearFile}
                            disabled={loading}
                          >
                            Clear
                          </Button>
                        )}
                      </InputGroup>
                      
                      {fileUploadName && (
                        <Alert variant="success" className="d-flex align-items-center">
                          <div>
                            <strong>File loaded:</strong> {fileUploadName}
                            {filePreview && (
                              <div className="mt-2">
                                <strong>Preview:</strong>
                                <div className="p-2 bg-light mt-1 border rounded">
                                  <small>{filePreview}</small>
                                </div>
                              </div>
                            )}
                          </div>
                        </Alert>
                      )}
                    </div>
                  </Tab>
                  
                  <Tab eventKey="paste" title="Paste Text">
                    <Form.Control
                      as="textarea"
                      rows={8}
                      value={sourceDocument}
                      onChange={(e) => setSourceDocument(e.target.value)}
                      placeholder="Paste the source document text here..."
                      disabled={loading}
                      required={useAI && activeTab === 'paste'}
                      className="mb-2"
                    />
                    <Form.Text className="text-muted">
                      The AI will generate questions based on this document content.
                    </Form.Text>
                  </Tab>
                </Tabs>
              </div>
              
              {loading && (
                <div className="mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between mb-2">
                    <Form.Label className="mb-0">Processing...</Form.Label>
                    <span>{Math.round(aiGenerationProgress)}%</span>
                  </div>
                  <ProgressBar 
                    now={aiGenerationProgress} 
                    animated 
                    className="mb-2"
                  />
                  {aiStatus && (
                    <div className="text-center text-muted">
                      <small>{aiStatus}</small>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label>Manual Questions</Form.Label>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={handleAddQuestion}
                  disabled={loading}
                >
                  Add Question
                </Button>
              </div>
              
              {questions.length === 0 ? (
                <Alert variant="info">
                  No questions added yet. Click "Add Question" to create one.
                </Alert>
              ) : (
                questions.map((question, index) => (
                  <Card key={question.id} className="mb-3">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <span>Question {index + 1}</span>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => handleRemoveQuestion(index)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Question Text</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={question.questionText}
                          onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                          disabled={loading}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Expected Answer</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="Enter the expected answer"
                          onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                          disabled={loading}
                          required
                        />
                        <Form.Text className="text-muted">
                          The answer will be hashed and stored on the blockchain.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-0">
                        <Form.Label>Explanation (Optional)</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={question.explanation}
                          onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)}
                          placeholder="Explanation for the correct answer"
                          disabled={loading}
                        />
                      </Form.Group>
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>
          )}
          
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Commit to blockchain immediately"
              checked={commitToBlockchain}
              onChange={(e) => setCommitToBlockchain(e.target.checked)}
              disabled={loading || !questionManager}
            />
            <Form.Text className="text-muted">
              If unchecked, question set will be saved locally until committed.
            </Form.Text>
          </Form.Group>
          
          <div className="d-flex gap-2">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
              className="px-4"
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : (
                'Create Question Set'
              )}
            </Button>
            
            {useAI && (
              <Button 
                variant="outline-primary" 
                onClick={handlePreview}
                disabled={loading || !sourceDocument.trim()}
              >
                Preview Generated Questions
              </Button>
            )}
          </div>
        </Form>
      </Card.Body>
      
      {/* Preview Modal */}
      <Modal 
        show={showPreview} 
        onHide={() => setShowPreview(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Question Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {questions.length > 0 ? (
            questions.map((question, index) => (
              <Card key={question.id} className="mb-3">
                <Card.Header>Question {index + 1}</Card.Header>
                <Card.Body>
                  <p><strong>Question:</strong> {question.questionText}</p>
                  
                  <p><strong>Answer:</strong> {question.answerText}</p>
                  <p><strong>Answer Hash:</strong> <code>{question.answerHash}</code></p>
                  {question.explanation && (
                    <p><strong>Explanation:</strong> {question.explanation}</p>
                  )}
                </Card.Body>
              </Card>
            ))
          ) : (
            <Alert variant="warning">No questions to preview.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowPreview(false);
              // Use these questions for the form submission
            }}
          >
            Use These Questions
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Debug Panel (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card.Footer className="bg-light">
          <details>
            <summary className="text-muted small">Debugging Tools</summary>
            <div className="mt-3">
              <h6 className="text-muted">Submission Test</h6>
              <p className="small text-muted">Try submitting a minimal test question set with the simplest possible data to diagnose permission/contract issues.</p>
              <div className="d-flex flex-wrap gap-2">
                <Button 
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    try {
                      if (!questionManager) {
                        alert("Contract not connected");
                        return;
                      }
                      
                      // Create a minimal test question set
                      const testId = "debug_test_" + Math.floor(Math.random() * 1000);
                      const testData = [{
                        id: "q1",
                        questionText: "Test question",
                        answerHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")),
                        answerText: "test", 
                        explanation: "Test explanation"
                      }];
                      
                      // Calculate hash
                      const contentHash = ethers.utils.keccak256(
                        ethers.utils.toUtf8Bytes(JSON.stringify(testData))
                      );
                      
                      // Create question set
                      const questionSet = {
                        id: testId,
                        questionCount: 1,
                        contentHash,
                        timestamp: Date.now(),
                        questionType: 'debug',
                        sourceDocumentPreview: "Test document",
                        questions: testData
                      };
                      
                      alert(`Attempting to submit test question set:\nID: ${testId}\nContent Hash: ${contentHash}\nQuestion Count: 1`);
                      
                      // Submit to blockchain with detailed error handling
                      try {
                        // First check signer
                        const signer = await questionManager.signer.getAddress();
                        console.log("Test using account:", signer);
                        
                        // Try gas estimation first
                        const gasEstimate = await questionManager.estimateGas.submitQuestionSetHash(
                          questionSet.id,
                          questionSet.contentHash,
                          questionSet.questionCount
                        );
                        
                        console.log("Gas estimate for test submission:", gasEstimate.toString());
                        
                        // If gas estimation succeeds, try the actual transaction with a gas limit
                        const tx = await questionManager.submitQuestionSetHash(
                          questionSet.id,
                          questionSet.contentHash,
                          questionSet.questionCount,
                          { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
                        );
                        
                        alert(`✅ Test transaction sent!\nTx Hash: ${tx.hash}\n\nWaiting for confirmation...`);
                        
                        // Wait for transaction
                        const receipt = await tx.wait();
                        alert(`✅ Test transaction confirmed!\nBlock: ${receipt.blockNumber}\nStatus: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
                      } catch (error) {
                        console.error("Test transaction failed:", error);
                        
                        // Format a readable error message
                        let errorMsg = error.message || "Unknown error";
                        if (errorMsg.includes("Internal JSON-RPC error")) {
                          errorMsg = "MetaMask RPC Error - This often means the contract rejected the transaction or you don't have permission";
                        }
                        
                        alert(`❌ Test transaction failed!\n\nError: ${errorMsg}`);
                      }
                    } catch (error) {
                      console.error("Test setup error:", error);
                      alert(`Test setup error: ${error.message}`);
                    }
                  }}
                >
                  Test Minimal Submission
                </Button>
                
                <Button 
                  size="sm"
                  variant="warning"
                  onClick={async () => {
                    try {
                      if (!questionManager) {
                        alert("Contract not connected");
                        return;
                      }
                      
                      // Get signer account
                      const signer = await questionManager.signer.getAddress();
                      alert(`Testing with account: ${signer}`);
                      
                      // Get provider network
                      const network = await questionManager.provider.getNetwork();
                      alert(`Connected to network: ${JSON.stringify({chainId: network.chainId, name: network.name})}`);
                      
                      // Test with a direct raw transaction approach
                      try {
                        // Use a simpler transaction - just call a view function first
                        alert("Testing a simple read operation first...");
                        
                        try {
                          const owner = await questionManager.owner();
                          alert(`Contract owner address: ${owner}`);
                          
                          if (owner.toLowerCase() !== signer.toLowerCase()) {
                            alert(`⚠️ WARNING: You are not the contract owner!\nYour address: ${signer}\nOwner address: ${owner}`);
                          } else {
                            alert(`You are the contract owner ✅`);
                          }
                        } catch (readError) {
                          alert(`Error reading owner: ${readError.message}`);
                        }
                        
                        // Now try a simple transaction that's unlikely to fail
                        // Use ethers directly with low-level parameters
                        alert("Attempting direct transaction with minimal data...");
                        
                        // Create a very simple test ID - use timestamp to ensure uniqueness
                        const simpleId = "simple_" + Date.now();
                        const simpleHash = ethers.utils.hexZeroPad("0x1", 32); // Very simple hash
                        const simpleCount = 1;
                        
                        // Log exact parameters
                        console.log("Simple transaction parameters:", {
                          id: simpleId,
                          hash: simpleHash,
                          count: simpleCount
                        });
                        
                        // Try with manual transaction
                        const rawTx = await questionManager.populateTransaction.submitQuestionSetHash(
                          simpleId,
                          simpleHash,
                          simpleCount
                        );
                        
                        // Modify gas parameters
                        rawTx.gasLimit = ethers.utils.hexlify(3000000); // Very high gas limit
                        delete rawTx.gasPrice; // Let MetaMask handle gas price
                        
                        console.log("Raw transaction data:", rawTx);
                        
                        // Send raw transaction
                        const provider = new ethers.providers.Web3Provider(window.ethereum);
                        const walletSigner = provider.getSigner();
                        const txResponse = await walletSigner.sendTransaction(rawTx);
                        
                        alert(`✅ Raw transaction sent!\nTx Hash: ${txResponse.hash}`);
                        
                        const txReceipt = await txResponse.wait();
                        alert(`✅ Transaction confirmed!\nBlock: ${txReceipt.blockNumber}`);
                      } catch (txError) {
                        console.error("Transaction test failed:", txError);
                        
                        // Enhanced error logging
                        let errorInfo = "Error details:\n";
                        if (txError.code) errorInfo += `Code: ${txError.code}\n`;
                        if (txError.reason) errorInfo += `Reason: ${txError.reason}\n`;
                        if (txError.method) errorInfo += `Method: ${txError.method}\n`;
                        if (txError.transaction) errorInfo += `Tx Data: ${JSON.stringify(txError.transaction)}\n`;
                        if (txError.data) errorInfo += `Data: ${JSON.stringify(txError.data)}\n`;
                        
                        console.error(errorInfo);
                        
                        alert(`❌ Test transaction failed!\n\nError: ${txError.message}`);
                      }
                    } catch (error) {
                      console.error("Error in advanced test:", error);
                      alert(`Advanced test error: ${error.message}`);
                    }
                  }}
                >
                  Advanced Diagnostic Test
                </Button>
                
                <Button 
                  size="sm"
                  variant="info"
                  onClick={async () => {
                    try {
                      if (!questionManager) {
                        alert("Contract not connected");
                        return;
                      }
                      
                      // Check connection details
                      const provider = questionManager.provider;
                      const signer = questionManager.signer;
                      
                      // Check account
                      const account = await signer.getAddress();
                      
                      // Output connection info
                      let info = "CONNECTION DIAGNOSTICS\n\n";
                      
                      // 1. Check network
                      const network = await provider.getNetwork();
                      info += `Network: ${network.name || 'localhost'} (Chain ID: ${network.chainId})\n`;
                      
                      if (network.chainId !== 31337) {
                        info += "⚠️ WARNING: Not connected to Hardhat network (Chain ID 31337)\n\n";
                      }
                      
                      // 2. Check connected account
                      info += `Connected account: ${account}\n`;
                      
                      const expectedAdmin = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
                      if (account.toLowerCase() !== expectedAdmin.toLowerCase()) {
                        info += `⚠️ WARNING: Not using admin account: ${expectedAdmin}\n\n`;
                      }
                      
                      // 3. Check ETH balance
                      const balance = await provider.getBalance(account);
                      info += `ETH Balance: ${ethers.utils.formatEther(balance)} ETH\n`;
                      
                      if (balance.eq(0)) {
                        info += "⚠️ WARNING: Account has 0 ETH balance\n\n";
                      }
                      
                      // 4. Check contract
                      info += `Contract address: ${questionManager.address}\n`;
                      
                      // 5. Check contract owner
                      try {
                        const owner = await questionManager.owner();
                        info += `Contract owner: ${owner}\n`;
                        
                        if (owner.toLowerCase() !== account.toLowerCase()) {
                          info += "⚠️ WARNING: You are not the contract owner\n\n";
                        } else {
                          info += "✅ You are the contract owner\n\n";
                        }
                      } catch (err) {
                        info += `Error checking owner: ${err.message}\n\n`;
                      }
                      
                      // 6. Check for transaction count/nonce issues
                      const transactionCount = await provider.getTransactionCount(account);
                      info += `Transaction count (nonce): ${transactionCount}\n`;
                      
                      // 7. Display block information
                      const blockNumber = await provider.getBlockNumber();
                      info += `Current block number: ${blockNumber}\n`;
                      
                      alert(info);
                    } catch (error) {
                      console.error("Diagnostics error:", error);
                      alert(`Error running diagnostics: ${error.message}`);
                    }
                  }}
                >
                  Check Admin Account
                </Button>
                
                <Button 
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    try {
                      if (!questionManager) {
                        alert("Contract not connected");
                        return;
                      }
                      
                      // First check if we can read from the contract
                      alert("Step 1: Testing contract read operations...");
                      
                      try {
                        const owner = await questionManager.owner();
                        alert(`✅ Successfully read contract owner: ${owner}`);
                      } catch (readError) {
                        alert(`❌ Failed to read contract owner: ${readError.message}`);
                        return;
                      }
                      
                      // Check if contract interface is correct by inspecting its functions
                      alert("Step 2: Checking contract interface...");
                      
                      try {
                        // This will throw if the function doesn't exist
                        if (!questionManager.functions.submitQuestionSetHash) {
                          alert("❌ Contract does not have submitQuestionSetHash function!");
                          return;
                        }
                        
                        alert("✅ Contract has submitQuestionSetHash function");
                      } catch (interfaceError) {
                        alert(`❌ Interface error: ${interfaceError.message}`);
                        return;
                      }
                      
                      // Check MetaMask state
                      alert("Step 3: Checking MetaMask state...");
                      
                      try {
                        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        alert(`Connected to chain ID: ${parseInt(chainId, 16)}`);
                        
                        // Check if we have the right account
                        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                        const account = accounts[0];
                        alert(`Using account: ${account}`);
                        
                        // Try to reset MetaMask transaction state
                        alert("Attempting to reset MetaMask state...");
                        await window.ethereum.request({
                          method: 'wallet_requestPermissions',
                          params: [{ eth_accounts: {} }]
                        });
                        
                        alert("✅ MetaMask permissions refreshed");
                      } catch (mmError) {
                        alert(`❌ MetaMask error: ${mmError.message}`);
                      }
                      
                      // Try a raw direct call to the node
                      alert("Step 4: Attempting direct node call...");
                      
                      try {
                        // First check if we can make a basic eth_call
                        const callData = await window.ethereum.request({
                          method: 'eth_call',
                          params: [{
                            to: questionManager.address,
                            data: '0x8da5cb5b' // owner() function signature
                          }, 'latest']
                        });
                        
                        alert(`✅ Direct eth_call successful: ${callData}`);
                      } catch (callError) {
                        alert(`❌ Direct eth_call failed: ${callError.message}`);
                      }
                      
                      // Final step: try a very simple transaction bypassing ethers
                      alert("Step 5: Trying minimal direct transaction...");
                      
                      try {
                        // Create simplest possible question set ID
                        const simpleId = "test123";
                        // Use a static hash that we know is valid
                        const simpleHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
                        // Encode the transaction data manually
                        
                        // Function signature for submitQuestionSetHash(string,bytes32,uint256)
                        const functionSignature = "0x" + ethers.utils.keccak256(
                          ethers.utils.toUtf8Bytes("submitQuestionSetHash(string,bytes32,uint256)")
                        ).substring(2, 10);
                        
                        // Encode parameters
                        const abiCoder = new ethers.utils.AbiCoder();
                        
                        // Need to encode the dynamic string with its offset and length
                        const encodedParams = abiCoder.encode(
                          ["string", "bytes32", "uint256"],
                          [simpleId, simpleHash, 1]
                        );
                        
                        const data = functionSignature + encodedParams.substring(2); // remove 0x
                        
                        alert("Sending direct transaction...");
                        console.log("Transaction data:", data);
                        
                        // Get accounts again to be sure we have the latest state
                        const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
                        if (!currentAccounts || currentAccounts.length === 0) {
                          throw new Error("No accounts connected to MetaMask");
                        }
                        
                        const txHash = await window.ethereum.request({
                          method: 'eth_sendTransaction',
                          params: [{
                            from: currentAccounts[0],
                            to: questionManager.address,
                            gas: '0x' + (3000000).toString(16), // Very high gas limit
                            data: data
                          }]
                        });
                        
                        alert(`✅ Transaction submitted! Hash: ${txHash}`);
                      } catch (txError) {
                        console.error("Raw tx error:", txError);
                        
                        let errorDetails = `❌ Transaction failed: ${txError.message}\n\n`;
                        
                        if (txError.code) errorDetails += `Error code: ${txError.code}\n`;
                        if (txError.data) errorDetails += `Error data: ${JSON.stringify(txError.data)}\n`;
                        
                        alert(errorDetails);
                      }
                    } catch (error) {
                      console.error("Deep diagnostic error:", error);
                      alert(`Deep diagnostics failed: ${error.message}`);
                    }
                  }}
                >
                  Deep Diagnostics
                </Button>
              </div>
            </div>
          </details>
        </Card.Footer>
      )}
    </Card>
  );
};

export default QuestionSetForm; 