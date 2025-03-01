import React, { useState, useCallback } from 'react';
import { Form, Button, Card, Alert, Spinner, Modal, ProgressBar } from 'react-bootstrap';
import { ethers } from 'ethers';
import { getOpenAIApiKey } from '../../config';
import { useDropzone } from 'react-dropzone';

const QuestionSetForm = ({ questionManager, onQuestionSetCreated }) => {
  // Form states
  const [name, setName] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiGenerationProgress, setAiGenerationProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');
  const [sourceDocument, setSourceDocument] = useState('');
  const [sourceDocumentName, setSourceDocumentName] = useState('');
  
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
  
  // Handle file drop with react-dropzone
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    if (file) {
      setSourceDocumentName(file.name);
      
      // Extract base filename without extension to use as set name
      const baseName = file.name.split('.')[0];
      // Always update the name when a new file is selected
      setName(baseName);
      
      const reader = new FileReader();
      
      reader.onload = () => {
        const text = reader.result;
        setSourceDocument(text);
      };
      
      reader.readAsText(file);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.markdown'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });
  
  // Updated AI question generation with actual OpenAI API integration
  const generateQuestionsWithAI = async (count) => {
    setLoading(true);
    setAiGenerationProgress(0);
    setAiStatus('Initializing AI question generation...');
    
    try {
      setAiGenerationProgress(10);
      setAiStatus('Connecting to OpenAI API...');
      
      // Get API key using our helper function (from config.js)
      const apiKey = getOpenAIApiKey();
      
      if (!apiKey) {
        throw new Error('OpenAI API key is missing. Please check your configuration or environment variables.');
      }
      
      // Clean the API key - remove any line breaks or whitespace
      const cleanApiKey = apiKey.replace(/\s+/g, '');
      
      setAiGenerationProgress(20);
      setAiStatus('Sending request to OpenAI...');
      
      // Use document content if available, otherwise default prompt
      let contentPrompt;
      if (sourceDocument && sourceDocument.trim() !== '') {
        // Limit document length to avoid token limit issues
        const maxLength = 12000;
        const trimmedDocument = sourceDocument.length > maxLength 
          ? sourceDocument.substring(0, maxLength) + '...(content truncated for length)'
          : sourceDocument;
        
        contentPrompt = promptTemplates.freeform
          .replace('{count}', count)
          .replace('{document}', trimmedDocument);
      } else {
        // No document, use default prompt
        contentPrompt = `Generate ${count} open-ended questions about web3, blockchain technology, and smart contracts. Include a mix of technical and conceptual questions suitable for a hackathon workshop.`;
      }
      
      // Using fetch to call OpenAI Chat Completions API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using GPT-4o-mini
          messages: [
            {
              role: "system",
              content: "You are an educational content creator specialized in generating high-quality assessment questions."
            },
            {
              role: "user",
              content: `${contentPrompt}

Format each question exactly as:
Question: [question text]
Answer: [expected answer]
Explanation: [explanation]`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      // Extract and parse OpenAI response
      setAiGenerationProgress(60);
      setAiStatus('Processing response...');
      
      const data = await response.json();
      const responseText = data.choices[0].message.content;
      
      console.log('AI Response:', responseText);
      
      setAiGenerationProgress(80);
      setAiStatus('Parsing questions...');
      
      // Parse the generated questions from the response
      const questions = parseQuestionsFromAIResponse(responseText);
      
      setAiGenerationProgress(100);
      setAiStatus('Questions generated successfully!');
      
      return questions;
    } catch (error) {
      console.error('Error generating questions with AI:', error);
      throw new Error(`Failed to generate questions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Parse questions from OpenAI response
  const parseQuestionsFromAIResponse = (responseText) => {
    const questions = [];
    const lines = responseText.split('\n');
    
    let currentQuestion = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      if (line.startsWith('Question:')) {
        // Start a new question
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        currentQuestion = {
          id: `q_${Date.now()}_${questions.length}`,
          questionText: line.substring('Question:'.length).trim(),
          answerText: '',
          explanation: ''
        };
      } else if (line.startsWith('Answer:') && currentQuestion) {
        currentQuestion.answerText = line.substring('Answer:'.length).trim();
      } else if (line.startsWith('Explanation:') && currentQuestion) {
        currentQuestion.explanation = line.substring('Explanation:'.length).trim();
      } else if (currentQuestion) {
        // Append to the last property we were setting
        if (currentQuestion.explanation) {
          currentQuestion.explanation += ' ' + line;
        } else if (currentQuestion.answerText) {
          currentQuestion.answerText += ' ' + line;
        } else {
          currentQuestion.questionText += ' ' + line;
        }
      }
    }
    
    // Add the last question if exists
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return questions;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (!name.trim()) {
        throw new Error('Please enter a name for the question set');
      }
      
      if (numberOfQuestions <= 0) {
        throw new Error('Please set a valid number of questions to generate');
      }
      
      // Generate questions with AI
      let questionData = await generateQuestionsWithAI(numberOfQuestions);
      
      if (questionData.length === 0) {
        throw new Error('Failed to generate any valid questions');
      }
      
      // Process questions to create the final format with answer hashes
      const finalQuestions = questionData.map(q => {
        // If the question already has an answerHash, use it
        if (q.answerHash) {
          return q;
        }
        
        // Otherwise, create the hash
        const answerHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(q.answerText || q.answer || '')
        );
        
        return {
          id: q.id || Math.random().toString(36).substring(2, 11),
          questionText: q.questionText || q.question || '',
          answerText: q.answerText || q.answer || '',
          answerHash: answerHash,
          explanation: q.explanation || ''
        };
      });
      
      // Create JSON representation
      const questionSetData = {
        id: `set_${Date.now()}`,
        name: name,
        questionCount: finalQuestions.length,
        questions: finalQuestions,
        metadata: {
          createdAt: new Date().toISOString(),
          generatedWithAI: true,
          aiModel: "gpt-4o-mini",
          sourceDocumentProvided: !!sourceDocument,
          sourceDocumentName: sourceDocumentName || null,
          sourceDocumentPreview: sourceDocument ? sourceDocument.substring(0, 200) + '...' : null
        }
      };
      
      // Calculate content hash from the full question set data
      const contentString = JSON.stringify(questionSetData);
      console.log("Content string length:", contentString.length);
      
      // Create keccak256 hash of the content
      const contentHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(contentString)
      );
      console.log("Content hash:", contentHash);
      
      // Store the question set data (in a real implementation, this would go to IPFS)
      // For now, we just store in localStorage
      localStorage.setItem(`questionset_${questionSetData.id}`, contentString);
      
      // Create question set object for the contract
      const questionSet = {
        id: name,
        questionCount: finalQuestions.length,
        contentHash,
        timestamp: Date.now(),
        questionType: questionType,
        sourceDocumentPreview: '',
        questions: finalQuestions
      };
      
      console.log("Final question set:", questionSet);
      
      // Store locally for later submission
      const localQuestionSets = JSON.parse(localStorage.getItem('questionSets') || '[]');
      localQuestionSets.push(questionSet);
      localStorage.setItem('questionSets', JSON.stringify(localQuestionSets));
      
      // Reset form
      setName('');
      setNumberOfQuestions(5);
      setQuestions([]);
      setSourceDocument('');
      setSourceDocumentName('');
      setSuccess(true);
      
      // Callback to parent if provided
      if (onQuestionSetCreated) {
        onQuestionSetCreated(questionSet);
      }
    } catch (error) {
      console.error("Error creating question set:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreview = async () => {
    try {
      const previewQuestions = await generateQuestionsWithAI(numberOfQuestions);
      setQuestions(previewQuestions);
      setShowPreview(true);
    } catch (error) {
      setError(`Failed to generate preview: ${error.message}`);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body className="p-4">
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
        
        <Form onSubmit={handleSubmit} className="compact-form">
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <Form.Group className="flex-grow-1 mb-0">
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
              
              <Form.Group className="mb-0">
                <Form.Label>Questions to Generate:</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="100"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                  disabled={loading}
                  style={{ width: '80px' }}
                />
              </Form.Group>
            </div>
            
            <div 
              {...getRootProps()} 
              className={`dropzone p-3 border rounded ${isDragActive ? 'bg-light border-primary' : ''}`}
              style={{ 
                cursor: 'pointer', 
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <input {...getInputProps()} />
              {sourceDocumentName ? (
                <>
                  <div className="text-center mb-2">
                    <strong>File uploaded:</strong> {sourceDocumentName}
                  </div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourceDocument('');
                      setSourceDocumentName('');
                      setName('');
                    }}
                  >
                    Remove File
                  </Button>
                </>
              ) : isDragActive ? (
                <p className="mb-0 text-center">Drop the file here...</p>
              ) : (
                <div className="text-center">
                  <p className="mb-2">Upload a file to generate questions from</p>
                  <small className="text-muted">Supported: .txt, .md, .markdown, .doc, .docx, .pdf</small>
                </div>
              )}
            </div>
            <Form.Text className="text-muted">
              If no document is provided, generic blockchain questions will be generated.
            </Form.Text>
          </div>
          
          {loading && (
            <div className="mt-3 mb-3">
              <ProgressBar 
                now={aiGenerationProgress} 
                label={`${Math.round(aiGenerationProgress)}%`} 
                variant="info" 
              />
              <div className="text-center text-muted mt-1">
                <small>{aiStatus}</small>
              </div>
            </div>
          )}
          
          <div className="d-flex gap-2 mt-3">
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
                'Generate Question Set'
              )}
            </Button>
            
            <Button
              variant="outline-secondary"
              onClick={handlePreview}
              disabled={loading}
            >
              Preview Questions
            </Button>
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
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default QuestionSetForm; 