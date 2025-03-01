# Chainlink Functions & OpenAI Security Guide

## Table of Contents
- [Understanding Chainlink Functions](#understanding-chainlink-functions)
  - [Core Components](#core-components)
  - [How It Works](#how-it-works)
  - [Configuration and Setup](#configuration-and-setup)
  - [Diagnostic Tools](#diagnostic-tools)
- [Securing Your OpenAI API Key](#securing-your-openai-api-key)
  - [Current Implementation](#current-implementation)
  - [Using Environment Variables](#using-environment-variables)
  - [Using a Backend Proxy](#using-a-backend-proxy)
  - [Using Chainlink Functions for OpenAI Access](#using-chainlink-functions-for-openai-access)
  - [Using a Secrets Manager](#using-a-secrets-manager)
  - [Using Local Encryption](#using-local-encryption)
  - [Best Practices](#best-practices)

## Understanding Chainlink Functions

Chainlink Functions is a feature that allows smart contracts to execute arbitrary JavaScript code off-chain while maintaining security and decentralization through Chainlink's oracle network.

### Core Components

1. **ChainlinkAnswerVerifier Contract**
   - The contract that interfaces with Chainlink's oracle network
   - Located in `contracts/ChainlinkAnswerVerifier.sol`
   - Communicates with the Chainlink Functions network via the Router contract

2. **QuestionManager Integration**
   - The main contract (`QuestionManager.sol`) references `ChainlinkAnswerVerifier`
   - It delegates answer verification to Chainlink when submitting assessments

3. **Configuration System**
   - Uses a Chainlink subscription ID (stored in `.env` as `CHAINLINK_SUBSCRIPTION_ID`)
   - Uses a DON ID (Decentralized Oracle Network ID - e.g., `fun-base-sepolia` for Base Sepolia)
   - Stores JavaScript source code that performs the evaluation in the smart contract

### How It Works

When a user submits an assessment in the AI Educator platform:

1. `QuestionManager` receives the submission with the answer hash
2. It calls the `ChainlinkAnswerVerifier` contract
3. `ChainlinkAnswerVerifier` creates a Chainlink Functions request
4. The request includes:
   - Question set ID
   - Answer hash
   - Question set content hash
   - Current timestamp
5. The request is sent to Chainlink's oracle network
6. Chainlink nodes execute the JavaScript evaluation code stored in the contract
7. Results are returned on-chain and stored in the `ChainlinkAnswerVerifier` contract
8. `QuestionManager` retrieves the results to determine if the answers are correct

The actual validation logic runs in a JavaScript function that executes off-chain on Chainlink's oracle network. This is defined in this codebase in `src/utils/llmEvaluator.js`'s `chainlinkFunction`.

### Configuration and Setup

To use Chainlink Functions in your project:

1. **Create a Chainlink Functions subscription**:
   - Visit https://functions.chain.link/base-sepolia
   - Connect your wallet (must be the same account used to deploy/administer the AI Educator platform)
   - Create a new subscription and fund it with LINK tokens (3-5 LINK recommended)

2. **Add your contract as a consumer**:
   - In the subscription details page, click "Add Consumer"
   - Enter your deployed `ChainlinkAnswerVerifier` contract address

3. **Configure your project**:
   - Add the Subscription ID to your `.env` file as `CHAINLINK_SUBSCRIPTION_ID`
   - Set the DON ID in your `.env` file (e.g., `CHAINLINK_DON_ID=fun-base-sepolia`)
   - Update your contract with the configuration using:
     ```
     npx hardhat update-chainlink --network baseSepoliaTestnet
     ```

4. **Test the integration**:
   ```
   npm run test:chainlink-setup
   ```

### Diagnostic Tools

The codebase includes several diagnostic tools to troubleshoot Chainlink integration:

1. **Web UI Diagnostics**:
   - The `DiagnosticPanel` component in `src/components/DiagnosticPanel.js`
   - The `ChainlinkAssessmentDiagnostic` component in `src/components/ChainlinkAssessmentDiagnostic.js`
   - Access these through the UI by clicking the "Diagnostics" button when submitting an assessment

2. **Command-line Scripts**:
   - `npm run test:chainlink-setup`: Validates your Chainlink configuration
   - `npm run test:gas-estimate`: Tests gas estimation for Chainlink function calls
   - `npm run chainlink:diagnose`: Runs a comprehensive diagnostic task

3. **Common Issues and Solutions**:
   - **Authorization Error**: "Caller not authorized"
     ```
     npx hardhat setup-chainlink-connection --network baseSepoliaTestnet
     ```
   - **Missing Source Code**: "Source code not set"
     ```
     npx hardhat update-chainlink --network baseSepoliaTestnet
     ```
   - **Invalid Subscription**: "Subscription ID not set" or "invalid subscription"
     - Verify your subscription ID is correct in `.env`
     - Ensure the subscription is funded with LINK tokens
     - Confirm your contract is added as a consumer

## Securing Your OpenAI API Key

### Current Implementation

In the current implementation, the OpenAI API key is stored in the `.env` file:

```
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

This approach has several security concerns:
- The API key is in plaintext
- There's a risk of accidental exposure in logs or client-side code
- Key rotation requires updating the `.env` file

### Using Environment Variables

The most basic approach is to use environment variables, but with added precautions:

1. **Never commit `.env` files to version control**:
   - Ensure `.env` is in your `.gitignore` file
   - Use `.env.sample` as a template without real values

2. **Set up different keys for different environments**:
   - Development: Use a key with lower rate limits
   - Production: Use a separate key with proper monitoring

3. **Isolate environment variable access**:
   - Create a dedicated module for accessing the API key
   - Log all access attempts

```javascript
// src/utils/apiKeyManager.js
export const getOpenAIApiKey = () => {
  const key = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (!key) {
    console.error("OpenAI API key not found");
    return null;
  }
  
  // Optional: Log access for auditing
  console.log("OpenAI API key accessed", new Date().toISOString());
  
  return key;
};
```

### Using a Backend Proxy

A more secure approach is to create a backend proxy service:

1. **Create a simple backend API endpoint**:
   ```javascript
   // server.js (Express example)
   app.post('/api/openai-proxy', async (req, res) => {
     try {
       const response = await fetch('https://api.openai.com/v1/chat/completions', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
         },
         body: JSON.stringify(req.body)
       });
       
       const data = await response.json();
       res.json(data);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

2. **Update your frontend code**:
   ```javascript
   // Instead of calling OpenAI directly
   const response = await fetch('/api/openai-proxy', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       model: "gpt-4o-mini",
       messages: [{ role: "user", content: question }]
     })
   });
   ```

3. **Add rate limiting and logging**:
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const openaiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Limit each IP to 100 requests per windowMs
     standardHeaders: true,
     legacyHeaders: false,
   });
   
   app.use('/api/openai-proxy', openaiLimiter);
   ```

### Using Chainlink Functions for OpenAI Access

Leverage Chainlink Functions to securely store and use your OpenAI API key:

1. **Create a Chainlink Functions Secret**:
   - Use the Chainlink Functions UI to encrypt your OpenAI API key
   - This keeps the key secure and only decrypted within the Chainlink DON

2. **Update your Chainlink source code**:
   ```javascript
   // This code runs in the Chainlink Functions environment
   const openAIKey = await secrets.get("openai_api_key");
   const openai = new OpenAI(openAIKey);
   
   // Then make your API calls
   const completion = await openai.chat.completions.create({
     model: "gpt-3.5-turbo",
     messages: [...]
   });
   ```

3. **Upload the source code and secret**:
   - Use the Chainlink Functions UI or CLI tools to upload both the source code and encrypted secret

This approach is particularly useful for the AI Educator platform since you're already using Chainlink Functions for answer verification.

### Using a Secrets Manager

For enterprise applications:

1. **Use a cloud secrets manager**:
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager
   - HashiCorp Vault

2. **Implement server-side access**:
   ```javascript
   // Example using AWS Secrets Manager
   const AWS = require('aws-sdk');
   const secretsManager = new AWS.SecretsManager();
   
   async function getOpenAIApiKey() {
     const data = await secretsManager.getSecretValue({ SecretId: 'openai/api-key' }).promise();
     const secret = JSON.parse(data.SecretString);
     return secret.apiKey;
   }
   ```

3. **Implement rotation policies**:
   - Automate key rotation using the secrets manager's rotation features
   - Update keys without changing code

### Using Local Encryption

If you need to keep the key locally:

1. **Encrypt the API key**:
   ```javascript
   const forge = require('node-forge');
   
   function encryptApiKey(apiKey, password) {
     const salt = forge.random.getBytesSync(128);
     const key = forge.pkcs5.pbkdf2(password, salt, iterations, 16);
     const iv = forge.random.getBytesSync(16);
     
     const cipher = forge.cipher.createCipher('AES-CBC', key);
     cipher.start({iv: iv});
     cipher.update(forge.util.createBuffer(apiKey));
     cipher.finish();
     
     return {
       salt: forge.util.encode64(salt),
       iv: forge.util.encode64(iv),
       encrypted: forge.util.encode64(cipher.output.getBytes())
     };
   }
   ```

2. **Store only the encrypted version**:
   ```
   OPENAI_ENCRYPTED_KEY={"salt":"...","iv":"...","encrypted":"..."}
   OPENAI_KEY_PASSWORD=your-password-here
   ```

3. **Decrypt at runtime**:
   ```javascript
   function decryptApiKey(encryptedData, password) {
     const salt = forge.util.decode64(encryptedData.salt);
     const key = forge.pkcs5.pbkdf2(password, salt, iterations, 16);
     const iv = forge.util.decode64(encryptedData.iv);
     const encrypted = forge.util.decode64(encryptedData.encrypted);
     
     const decipher = forge.cipher.createDecipher('AES-CBC', key);
     decipher.start({iv: iv});
     decipher.update(forge.util.createBuffer(encrypted));
     decipher.finish();
     
     return decipher.output.toString();
   }
   ```

### Best Practices

Regardless of which method you choose:

1. **Rotate Keys Regularly**:
   - Generate new API keys every 30-90 days
   - Immediately revoke any potentially exposed keys

2. **Implement Rate Limiting**:
   - Prevent abuse of your API key
   - Set up alerts for unusual usage patterns

3. **Use Minimal Permissions**:
   - Create an OpenAI API key with only the permissions your application needs
   - Use separate keys for different components of your application

4. **Monitor Usage**:
   - Track API usage to identify potential abuse
   - Set up billing alerts to avoid unexpected charges

5. **Implement Access Logging**:
   - Log every access to the API key
   - Review logs regularly for unauthorized access

6. **Use Key Vaults in Production**:
   - Never hardcode keys in any environment
   - Use specialized key management services in production

For the AI Educator platform, the recommended approach is to leverage Chainlink Functions for OpenAI API access, as you're already using this technology for answer verification. 