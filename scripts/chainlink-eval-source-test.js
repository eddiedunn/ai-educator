// Test script for the Chainlink Functions evaluation source
// This mimics the environment and execution of the source code in Chainlink Functions

// This is the same code that goes into the evaluationSource function in ChainlinkAnswerVerifier
const evaluationSourceCode = `
// LLM Evaluator for Chainlink Functions - Testing Version
// This version is designed to work in Chainlink Functions without external imports

// The args parameter contains:
// - questionSetId: The ID of the question set being evaluated
// - answersHash: The hash of the user's answers
// - questionSetContentHash: The hash of the question set content (unused in demo)
// - blockTimestamp: The timestamp when the request was made (unused in demo)

// Mock implementation - in a real deployment, this would retrieve data from IPFS or a decentralized storage
function getQuestionSet(questionSetId) {
  // Return a mock question set for testing
  return {
    id: questionSetId,
    title: "Mock Question Set",
    questions: [
      {
        id: "q1",
        text: "Explain the concept of blockchain consensus and provide an example of a consensus mechanism."
      },
      {
        id: "q2",
        text: "Compare and contrast Proof of Work and Proof of Stake."
      }
    ]
  };
}

// Mock implementation - in a real deployment, this would retrieve data from IPFS
function getAnswers(answersHash) {
  // Return mock answers for testing
  return {
    questionSetId: "univ2",
    answers: [
      {
        questionId: "q1",
        answer: "Blockchain consensus ensures all nodes agree on the state of the blockchain. Proof of Work is an example where miners solve puzzles to add blocks."
      },
      {
        questionId: "q2",
        answer: "PoW requires computational work and energy. PoS requires validators to stake tokens as collateral."
      }
    ]
  };
}

// Evaluation function for Chainlink Functions
async function evaluateAnswer(question, answer) {
  // In a real implementation, this would call an API endpoint
  // For this demo/test, we'll generate a random score
  
  const randomScore = Math.floor(Math.random() * 30) + 70; // 70-100
  
  return {
    questionId: question.id,
    score: randomScore,
    feedback: randomScore > 85 
      ? "Excellent answer that demonstrates understanding of the concept."
      : "Good answer that covers main points, but could be more comprehensive."
  };
}

// Main function - this is what Chainlink Functions executes
async function evaluateSubmission(args) {
  try {
    // Parse arguments
    const [questionSetId, answersHash] = args;
    
    // Get question set and answers
    const questionSet = getQuestionSet(questionSetId);
    const answerData = getAnswers(answersHash);
    
    // Evaluate each answer
    let totalScore = 0;
    const evaluations = [];
    
    for (const question of questionSet.questions) {
      // Find matching answer
      const answerObj = answerData.answers.find(a => a.questionId === question.id);
      const answer = answerObj ? answerObj.answer : "No answer provided";
      
      // Evaluate answer
      const evaluation = await evaluateAnswer(question, answer);
      evaluations.push(evaluation);
      totalScore += evaluation.score;
    }
    
    // Calculate average score (0-100)
    const averageScore = Math.floor(totalScore / questionSet.questions.length);
    
    // Generate a random hash for results
    let resultsHash = "0x";
    for (let i = 0; i < 64; i++) {
      resultsHash += Math.floor(Math.random() * 16).toString(16);
    }
    
    // Return results as string: "score,resultsHash"
    return \`\${averageScore},\${resultsHash}\`;
  } catch (error) {
    console.error("Error in evaluation:", error);
    return "0,0x0000000000000000000000000000000000000000000000000000000000000000";
  }
}
`;

// Test driver for the evaluation source code
async function testChainlinkFunctionsCode() {
  console.log("Testing Chainlink Functions Evaluation Source\n");
  console.log("=============================================\n");
  
  // Create a sandbox environment to execute the evaluation source
  try {
    // Sample arguments as they would be passed in Chainlink Functions
    const args = ["univ2", "0x1234567890abcdef"];
    
    // Execute the code in a controlled environment
    console.log("Executing evaluation source code...\n");
    
    // Create a function from the source code
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const evaluationModule = new AsyncFunction('evaluationSourceCode', `
      ${evaluationSourceCode}
      return { evaluateSubmission };
    `);
    
    // Execute the function
    const { evaluateSubmission } = await evaluationModule(evaluationSourceCode);
    const result = await evaluateSubmission(args);
    
    // Display results
    console.log("Evaluation Result:");
    console.log("----------------");
    const [score, hash] = result.split(',');
    console.log(`Score: ${score}/100`);
    console.log(`Results Hash: ${hash}`);
    console.log("\nTest completed successfully!");
    
    // Return the evaluation source for use in ChainlinkAnswerVerifier
    console.log("\n=============================================");
    console.log("CHAINLINK FUNCTIONS SOURCE CODE:");
    console.log("=============================================\n");
    console.log(evaluationSourceCode.trim());
    console.log("\n=============================================");
    console.log("Copy the above code into the source code editor in the Chainlink Setup panel");
  } catch (error) {
    console.error("Error testing Chainlink Functions code:", error);
  }
}

// Run the test
testChainlinkFunctionsCode().catch(error => {
  console.error("Unhandled error:", error);
}); 