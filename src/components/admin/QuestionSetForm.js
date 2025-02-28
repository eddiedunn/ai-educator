import React, { useState, useRef } from 'react';
import { Form, Button, Card, Alert, Spinner, Modal, ProgressBar, InputGroup, Badge, Tabs, Tab } from 'react-bootstrap';
import { ethers } from 'ethers';

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
  const [aiModel, setAiModel] = useState('gpt-3.5');
  const [aiStatus, setAiStatus] = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef(null);
  
  // AI prompt templates for different tasks
  const promptTemplates = {
    'multiplechoice': `Generate {count} multiple-choice questions based on the following content. For each question, include 4 options (A, B, C, D) with exactly one correct answer. Also include a brief explanation for why the correct answer is right.
    
Content: {document}

Format each question as:
Question: [question text]
A. [option A]
B. [option B]
C. [option C]
D. [option D]
Correct: [letter of correct option]
Explanation: [explanation]`,

    'truefalse': `Generate {count} true/false questions based on the following content. Include a brief explanation for why each statement is true or false.
    
Content: {document}

Format each question as:
Statement: [statement]
Correct: [True/False]
Explanation: [explanation]`,

    'shortanswer': `Generate {count} short answer questions based on the following content. These should be questions that can be answered in one or two sentences. Include the ideal answer and an explanation.
    
Content: {document}

Format each question as:
Question: [question text]
Answer: [ideal answer]
Explanation: [explanation]`
  };
  
  const [questionType, setQuestionType] = useState('multiplechoice');

  // Enhanced AI question generation with more realistic API simulation
  const generateQuestionsWithAI = async (document, count) => {
    setLoading(true);
    setAiGenerationProgress(0);
    setAiStatus('Analyzing document content...');
    
    try {
      // In a real implementation, this would call an AI service API
      // const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      // const response = await fetch('https://api.openai.com/v1/completions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${apiKey}`
      //   },
      //   body: JSON.stringify({
      //     model: aiModel === 'gpt-4' ? 'gpt-4-turbo' : 'gpt-3.5-turbo',
      //     prompt: promptTemplates[questionType]
      //       .replace('{count}', count)
      //       .replace('{document}', document),
      //     max_tokens: 2000,
      //     temperature: 0.7
      //   })
      // });
      // const data = await response.json();
      // Parse the AI response and extract questions...
      
      // For demo purposes, we'll simulate AI generation with progress updates
      const simulatedQuestions = [];
      
      // Stage 1: Document analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAiGenerationProgress(10);
      setAiStatus('Extracting key concepts...');
      
      // Stage 2: Key concept extraction
      await new Promise(resolve => setTimeout(resolve, 800));
      setAiGenerationProgress(25);
      setAiStatus('Formulating questions...');
      
      // Simulate different question types based on selection
      for (let i = 0; i < count; i++) {
        await new Promise(resolve => setTimeout(resolve, 700)); 
        
        let questionObj = { id: `q${i+1}` };
        
        if (questionType === 'multiplechoice') {
          const options = ['Paris', 'London', 'Berlin', 'Madrid'];
          const correct = Math.floor(Math.random() * 4);
          const letters = ['A', 'B', 'C', 'D'];
          
          questionObj.questionText = `Sample MC question ${i+1}: What is the capital of ${document.substring(0, 15)}...?`;
          questionObj.options = options.map((opt, idx) => ({ 
            letter: letters[idx], 
            text: opt 
          }));
          questionObj.correctOption = letters[correct];
          questionObj.answerHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(letters[correct]));
          questionObj.explanation = `${options[correct]} is the correct answer because it is the capital city.`;
        } 
        else if (questionType === 'truefalse') {
          const isTrue = Math.random() > 0.5;
          questionObj.questionText = `True or False: ${document.substring(0, 20)}... is related to question ${i+1}.`;
          questionObj.answerHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(isTrue ? 'True' : 'False'));
          questionObj.explanation = `This statement is ${isTrue ? 'true' : 'false'} because of factors related to the content.`;
        }
        else {
          questionObj.questionText = `Short answer question ${i+1} about ${document.substring(0, 20)}...?`;
          const answer = `Sample answer ${i+1}`;
          questionObj.answerHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answer));
          questionObj.explanation = `The correct answer is "${answer}" because it addresses the key aspects mentioned in the question.`;
        }
        
        simulatedQuestions.push(questionObj);
        setAiGenerationProgress(25 + ((i + 1) / count) * 65);
        setAiStatus(`Generated question ${i+1} of ${count}...`);
      }
      
      // Final processing
      setAiGenerationProgress(95);
      setAiStatus('Finalizing question set...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setAiGenerationProgress(100);
      setAiStatus('Question generation complete!');
      
      return simulatedQuestions;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please provide a name for the question set');
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
      const contentHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(JSON.stringify(questionData))
      );
      
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
        setAiStatus('Submitting to blockchain...');
        const tx = await questionManager.submitQuestionSetHash(
          questionSet.id,
          questionSet.contentHash,
          questionSet.questionCount
        );
        
        setAiStatus('Waiting for transaction confirmation...');
        await tx.wait();
        setAiStatus('Transaction confirmed!');
        
        // Save to local storage even if committed to blockchain for local reference
        const existingSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
        questionSet.onChain = true; // Mark as on chain
        localStorage.setItem('questionSets', JSON.stringify([...existingSets, questionSet]));
      } else {
        // Save to local storage temporarily
        const existingSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
        questionSet.onChain = false; // Mark as not on chain yet
        localStorage.setItem('questionSets', JSON.stringify([...existingSets, questionSet]));
      }
      
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
            <Form.Check
              type="checkbox"
              label="Generate questions with AI"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              disabled={loading}
            />
          </Form.Group>
          
          {useAI ? (
            <>
              {/* AI Question Generation Options */}
              <div className="mb-3 p-3 border rounded bg-light">
                <h6>AI Generation Settings</h6>
                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Question Type</Form.Label>
                      <Form.Select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="multiplechoice">Multiple Choice</option>
                        <option value="truefalse">True/False</option>
                        <option value="shortanswer">Short Answer</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>AI Model</Form.Label>
                      <Form.Select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        disabled={loading}
                      >
                        <option value="gpt-3.5">GPT-3.5 (Faster)</option>
                        <option value="gpt-4">GPT-4 (Higher Quality)</option>
                      </Form.Select>
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
                        <Form.Label>Answer</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Correct answer"
                          onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                          disabled={loading}
                          required
                        />
                        <Form.Text className="text-muted">
                          This will be hashed and stored on the blockchain.
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
                  
                  {question.options && (
                    <div className="mb-3">
                      <p><strong>Options:</strong></p>
                      <ul className="list-group">
                        {question.options.map(option => (
                          <li 
                            key={option.letter} 
                            className={`list-group-item ${option.letter === question.correctOption ? 'list-group-item-success' : ''}`}
                          >
                            {option.letter}. {option.text} 
                            {option.letter === question.correctOption && (
                              <Badge bg="success" className="ms-2">Correct</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
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
    </Card>
  );
};

export default QuestionSetForm; 