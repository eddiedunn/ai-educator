# Chainlink Functions Integration Guide

## Overview

This guide explains how to set up and use Chainlink Functions for decentralized answer verification in the AI Educator platform. Chainlink Functions allows us to run custom JavaScript code off-chain in a decentralized manner, making it perfect for AI-based assessment evaluation without trusting a centralized server.

## How It Works

1. **User submits assessment answers** to the QuestionManager contract
2. **QuestionManager requests verification** from the ChainlinkAnswerVerifier contract
3. **ChainlinkAnswerVerifier triggers Chainlink Functions** to evaluate the answers
4. **Decentralized Chainlink nodes execute** the evaluation code
5. **Results are returned on-chain** to the ChainlinkAnswerVerifier
6. **QuestionManager receives the score** and issues rewards based on performance

## Prerequisites

Before setting up Chainlink Functions, ensure you have:

- A funded wallet on Avalanche Fuji testnet or Base Sepolia testnet
- LINK tokens for the selected testnet (get from [Chainlink Faucet](https://faucets.chain.link/))
- A Chainlink Functions subscription (detailed below)
- Admin access to the AI Educator platform

## Creating a Chainlink Functions Subscription

1. **Visit the Chainlink Functions UI**:
   - For Avalanche Fuji: [https://functions.chain.link/fuji](https://functions.chain.link/fuji)
   - For Base Sepolia: [https://functions.chain.link/base-sepolia](https://functions.chain.link/base-sepolia)

2. **Connect your wallet** (must be the same account used to deploy/administer the AI Educator platform)

3. **Create a new subscription**:
   - Click "Create Subscription"
   - Fund with at least 3-5 LINK tokens
   - Save your Subscription ID

4. **Add the ChainlinkAnswerVerifier contract as a consumer**:
   - In the subscription detail page, click "Add Consumer"
   - Enter your deployed ChainlinkAnswerVerifier contract address
   - Confirm the transaction

## Configuring the AI Educator Platform

1. **Access the Admin Panel** in the AI Educator platform

2. **Navigate to the Chainlink Setup section**

3. **Enter the required information**:
   - DON ID: Use `fun-avalanche-fuji` for Fuji or `fun-base-sepolia` for Base Sepolia
   - Subscription ID: Your Chainlink subscription ID from the previous step

4. **Customize the source code** (optional):
   - The default evaluation code will work out of the box
   - Advanced users can modify the evaluation algorithm in the source code editor

5. **Click "Setup Chainlink Verifier"** and approve the transaction

6. **Test the integration** by clicking the "Test Chainlink Integration" button

## Understanding the Source Code

The default source code for Chainlink Functions evaluates answers based on a simple comparison. Here's a breakdown:

```javascript
// The args parameter contains:
// - questionSetId: The ID of the question set being evaluated
// - answersHash: The hash of the user's answers
// - questionSetContentHash: The hash of the question set content
// - blockTimestamp: The timestamp of when the request was made

// This is a sample evaluation function
function evaluateAnswers(questionText, userAnswer) {
  // In a production environment, this would use a real AI evaluation
  // to assess the quality of the answer based on the question
  
  // Score on a scale of 0-100
  if (userAnswer.length > 100) {
    return 85; // Longer answers get a good base score
  } else if (userAnswer.length > 50) {
    return 70; // Medium length answers get an average score
  } else {
    return 50; // Short answers get a minimum passing score
  }
}

// This is the main entry point for the Chainlink Functions
function chainlinkFunction(args) {
  // In a real implementation, we would:
  // 1. Retrieve the question set and answers from IPFS using their hashes
  // 2. Parse the content
  // 3. Evaluate each answer against its question
  // 4. Calculate a weighted average score
  
  // For this demo, we'll return a simulated score (0-100)
  const evaluationScore = 85;
  
  return evaluationScore;
}
```

## Common Issues and Debugging

### "No DON ID or Subscription ID configured"

- Verify you've correctly entered both the DON ID and Subscription ID
- Check that the transaction to update these values was confirmed
- The DON ID should match your selected testnet (e.g., `fun-avalanche-fuji`)

### "Transaction reverted: Chainlink Functions subscription not set"

- Verify your subscription is active on the Chainlink Functions UI
- Ensure the ChainlinkAnswerVerifier contract is added as a consumer
- Make sure you have sufficient LINK tokens in your subscription

### "Chainlink Functions request failed or timed out"

- Check your subscription's remaining balance of LINK tokens
- Verify that your source code doesn't have any errors
- The Chainlink network might be experiencing delays - try again later

### "Verification score always returns zero"

- Verify that the source code is properly evaluating the answers
- Check the ChainlinkAnswerVerifier contract logs for error messages
- Try using the bypass option temporarily and review contract events

## Using the Bypass Option

If Chainlink Functions are not working correctly, administrators can enable the bypass option:

1. In the DiagnosticPanel, click "Disable Chainlink Temporarily"
2. Users can now submit assessments using the "Submit with Chainlink Bypass" button
3. Remember to re-enable Chainlink when issues are resolved

## Production Considerations

When deploying to production:

1. **Use a proper IPFS integration** instead of the mock storage
2. **Implement a robust evaluation algorithm** in the Chainlink Functions source code
3. **Maintain sufficient LINK balance** in your subscription
4. **Consider implementing a fallback mechanism** for Chainlink downtimes
5. **Monitor your subscription usage** to avoid running out of LINK tokens
6. **Consider using multiple Chainlink Functions requests** for large assessments
7. **Implement request timeouts and retries** for improved reliability

## Advanced Configuration

### Customizing the Evaluation Algorithm

For more advanced evaluations, modify the evaluation function in the source code:

```javascript
function evaluateAnswers(questionText, userAnswer) {
  // Implement your custom evaluation logic here
  // You can include third-party libraries as needed
  
  // Example: Basic keyword matching
  const keywords = ["blockchain", "decentralized", "consensus", "smart contract"];
  let score = 50; // Base score
  
  // Count matching keywords
  keywords.forEach(keyword => {
    if (userAnswer.toLowerCase().includes(keyword.toLowerCase())) {
      score += 10; // Add points for each keyword
    }
  });
  
  // Cap at 100
  return Math.min(score, 100);
}
```

### Utilizing OpenAI Evaluation

To integrate OpenAI for evaluations (requires a different approach):

1. Set up a secure API gateway (Chainlink Functions cannot directly access OpenAI)
2. Modify the source code to call your API gateway
3. Implement the API gateway to process evaluations with OpenAI
4. Return results to the Chainlink Functions request

## Resources

- [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- [Avalanche Fuji Testnet Faucet](https://faucet.avax.network/)
- [Chainlink Faucet](https://faucets.chain.link/)
- [ChainlinkAnswerVerifier Contract Documentation](./docs/ChainlinkAnswerVerifier.md) 