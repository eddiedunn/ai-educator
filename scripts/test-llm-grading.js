// Script to test LLM grading functionality directly
require('dotenv').config();
const { evaluateWithOpenAI, mockEvaluateWithOpenAI } = require('../src/utils/llmEvaluator');

// Set debug mode
process.env.DEBUG = 'true';

// Sample question and answer
const sampleQuestion = {
  id: "q1",
  text: "Explain the concept of blockchain consensus and provide an example of a consensus mechanism."
};

const goodAnswer = `
Blockchain consensus is the process by which all nodes in a distributed network agree on the state of the blockchain. 
It ensures that all transactions are valid and that everyone has the same copy of the ledger. 
This is essential for solving the double-spending problem in a decentralized system.

An example of a consensus mechanism is Proof of Work (PoW), used by Bitcoin. In PoW, miners compete to solve complex mathematical puzzles. 
The first miner to find a solution gets to add a new block to the blockchain and receives a reward. 
This mechanism requires significant computational resources, which makes it secure against attacks but also energy-intensive.

Other examples include Proof of Stake (PoS), where validators are selected based on how many coins they hold and are willing to "stake" as collateral, 
and Delegated Proof of Stake (DPoS), where token holders vote for representatives who validate transactions.
`;

const poorAnswer = "Blockchain consensus is when everyone agrees. An example is Bitcoin mining.";

// Test function to evaluate answers
async function testLLMGrading() {
  console.log('Testing LLM Grading Functionality\n');

  console.log('Sample Question:');
  console.log(sampleQuestion.text);
  console.log('\n---------------------------------------\n');

  try {
    // Test with good answer using real OpenAI
    console.log('Testing comprehensive answer with OpenAI:');
    const goodResult = await evaluateWithOpenAI(sampleQuestion, goodAnswer);
    console.log(`Score: ${goodResult.score}/100`);
    console.log(`Feedback: ${goodResult.feedback}`);
    console.log('\n---------------------------------------\n');

    // Test with poor answer using real OpenAI
    console.log('Testing basic answer with OpenAI:');
    const poorResult = await evaluateWithOpenAI(sampleQuestion, poorAnswer);
    console.log(`Score: ${poorResult.score}/100`);
    console.log(`Feedback: ${poorResult.feedback}`);
    console.log('\n---------------------------------------\n');

    // Test with mock evaluator as fallback
    console.log('Testing with mock evaluator (fallback):');
    const mockResult = await mockEvaluateWithOpenAI(sampleQuestion, goodAnswer);
    console.log(`Score: ${mockResult.score}/100`);
    console.log(`Feedback: ${mockResult.feedback}`);
    console.log('\n---------------------------------------\n');

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing LLM grading:', error);
    console.log('\nFalling back to mock evaluation...');
    
    // Fallback to mock evaluation
    const mockResult = await mockEvaluateWithOpenAI(sampleQuestion, goodAnswer);
    console.log(`Mock Score: ${mockResult.score}/100`);
    console.log(`Mock Feedback: ${mockResult.feedback}`);
  }
}

// Run the test
testLLMGrading().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 