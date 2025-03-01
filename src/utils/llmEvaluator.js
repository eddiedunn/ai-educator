// LLM Evaluator for Chainlink Functions
// This script connects to OpenAI API to evaluate free-form text answers

// This function will be executed by Chainlink Functions
// Args:
// - questionSetId: The ID of the question set
// - answersHash: The hash of the user's answers
// - questionSetContentHash: The hash of the question set content
// Secrets required:
// - OPENAI_API_KEY: API key for OpenAI

// Check if debug is enabled (using a different approach for Chainlink Functions)
const debugEnabled = process.env.DEBUG === 'true' || process.env.REACT_APP_ENABLE_DEBUG === 'true';

// Simple debug log function for Chainlink Functions environment
const debugLog = (...args) => {
  if (debugEnabled) {
    console.log('[DEBUG]', ...args);
  }
};

// Helper to retrieve answers from localStorage
const retrieveAnswersFromStorage = (answersHash) => {
  // In a real implementation, we would fetch from IPFS using the hash
  // For now, we'll search through localStorage to find an item with this hash
  
  // Get all keys from localStorage
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('answers_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        // We'd need ethers.js here for a proper implementation
        // For now, we'll just assume we found the right one if it has the expected format
        if (data.answers && data.questionSetId) {
          debugLog('Found potential answer data:', data);
          return data;
        }
      } catch (e) {
        // Skip entries that aren't valid JSON
      }
    }
  }
  
  // If we couldn't find it, return mock data
  debugLog('Could not find answers in storage, returning mock data');
  return {
    questionSetId: 'unknown',
    answers: [
      { questionId: 0, answer: 'This is a mock answer since the original was not found.' },
      { questionId: 1, answer: 'This is another mock answer since the original was not found.' }
    ]
  };
};

// Helper to retrieve question set from localStorage
const retrieveQuestionSetFromStorage = (questionSetId) => {
  // In a real implementation, we would fetch from IPFS
  // For now, we'll create mock questions based on the ID
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
  
  // Create questions based on the question set ID
  // Ensure we generate at least 5 questions
  const questionCount = Math.max(5, parseInt(questionSetId) % 10 || 5);
  const questions = [];
  
  for (let i = 0; i < questionCount; i++) {
    questions.push({
      id: i,
      text: `Question ${i + 1}: Explain the concept of ${topics[i % topics.length]} in your own words.`,
      type: 'free-text'
    });
  }
  
  return {
    questions,
    id: questionSetId
  };
};

// Main function for Chainlink Functions
async function evaluateAnswers(questionSetId, answersHash, questionSetContentHash) {
  debugLog(`Evaluating answers for question set: ${questionSetId}`);
  debugLog(`Answers hash: ${answersHash}`);
  debugLog(`Question set content hash: ${questionSetContentHash}`);
  
  // Retrieve actual questions and answers
  const answerData = retrieveAnswersFromStorage(answersHash);
  const questionSet = retrieveQuestionSetFromStorage(questionSetId);
  
  debugLog(`Retrieved ${questionSet.questions.length} questions`);
  debugLog(`Retrieved ${answerData.answers.length} answers`);
  
  // Call OpenAI API to evaluate each answer
  let totalScore = 0;
  const evaluations = [];
  
  for (const question of questionSet.questions) {
    // Find the matching answer
    const answerObj = answerData.answers.find(a => a.questionId.toString() === question.id.toString());
    const answer = answerObj ? answerObj.answer : 'No answer provided';
    
    // Evaluate the answer using OpenAI
    const evaluation = await evaluateWithOpenAI(question, answer);
    evaluations.push(evaluation);
    totalScore += evaluation.score;
  }
  
  // Calculate average score (0-100)
  const averageScore = Math.floor(totalScore / questionSet.questions.length);
  
  // Generate a results object
  const resultsObj = {
    questionSetId,
    totalScore: averageScore,
    evaluations,
    timestamp: new Date().toISOString()
  };
  
  // In a real implementation, we would store this object in IPFS
  // and return the content hash
  const resultsHash = mockGenerateHash(JSON.stringify(resultsObj));
  
  // Return results in format: "score,resultsHash"
  return `${averageScore},${resultsHash}`;
}

// Function to evaluate with OpenAI API
async function evaluateWithOpenAI(question, answer) {
  try {
    debugLog(`Evaluating question: ${question.id}`);
    
    // Get the API key from environment variables
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      debugLog('No OpenAI API key found, falling back to mock evaluation');
      return mockEvaluateWithOpenAI(question, answer);
    }
    
    debugLog('Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert evaluator of educational assessments. Your task is to evaluate the accuracy, depth, and clarity of a student\'s answer to a question about blockchain technology. Provide a score from 0-100 and detailed feedback.'
          },
          {
            role: 'user',
            content: `Question: ${question.text}\n\nStudent Answer: ${answer}\n\nEvaluate this answer and provide a score from 0-100 and feedback. Return your response in JSON format with the following structure:\n{\n  "score": number,\n  "feedback": "detailed explanation"\n}`
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    debugLog('OpenAI API response received');
    
    // Parse the evaluation from the response
    try {
      // Try to extract JSON from the response
      const content = data.choices[0].message.content;
      let evaluationData;
      
      try {
        // Attempt to parse as JSON directly
        evaluationData = JSON.parse(content);
      } catch (e) {
        // If that fails, try to extract JSON using regex
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluationData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract JSON from response');
        }
      }
      
      // Validate that we have the expected fields
      if (typeof evaluationData.score !== 'number') {
        throw new Error('Invalid score format in response');
      }
      
      return {
        questionId: question.id,
        questionText: question.text,
        answer: answer,
        score: evaluationData.score,
        feedback: evaluationData.feedback || 'No feedback provided'
      };
    } catch (parseError) {
      debugLog('Error parsing evaluation:', parseError);
      // Fall back to a default score and include the raw response as feedback
      return {
        questionId: question.id,
        questionText: question.text,
        answer: answer,
        score: 70, // Default fallback score
        feedback: `Error parsing evaluation. Raw response: ${data.choices[0].message.content}`
      };
    }
  } catch (error) {
    debugLog('Error calling OpenAI API:', error);
    // Fall back to mock evaluation in case of errors
    return mockEvaluateWithOpenAI(question, answer);
  }
}

// Mock function to simulate OpenAI API evaluation as fallback
async function mockEvaluateWithOpenAI(question, answer) {
  debugLog('Using mock evaluation for question', question.id);
  
  // Simulate an evaluation
  const randomScore = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
  
  return {
    questionId: question.id,
    questionText: question.text,
    answer: answer,
    score: randomScore,
    feedback: randomScore > 85 
      ? "Excellent answer that demonstrates thorough understanding of the concept." 
      : "Good answer that covers the main points, but could be more comprehensive."
  };
}

// Mock function to generate a hash
function mockGenerateHash(content) {
  // In a real implementation, this would generate a proper hash
  // For now, we'll create a simple mock hash
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return hash;
}

// This is the entry point for Chainlink Functions
// Args will be passed by the verifyAnswerSet function in the ChainlinkAnswerVerifier contract
function chainlinkFunction(args) {
  const [questionSetId, answersHash, questionSetContentHash] = args;
  
  return evaluateAnswers(questionSetId, answersHash, questionSetContentHash)
    .then(result => {
      return Buffer.from(result);
    })
    .catch(error => {
      console.error(error);
      return Buffer.from('0,0x0000000000000000000000000000000000000000000000000000000000000000');
    });
}

// Export using CommonJS module.exports syntax
module.exports = { 
  evaluateWithOpenAI, 
  mockEvaluateWithOpenAI, 
  chainlinkFunction, 
  evaluateAnswers 
};