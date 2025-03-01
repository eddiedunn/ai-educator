# Chainlink Functions Diagnostics Guide

This guide explains how to use the diagnostic tools we've added to help identify and resolve issues with the Chainlink Functions integration in the AI Educator platform.

## Available Diagnostic Tools

We've implemented several diagnostic tools to help troubleshoot Chainlink Functions integration:

1. **Web UI Diagnostics Panel**: Integrated directly into the assessment submission UI
2. **Command-line Diagnostic Scripts**: For developers to test from the terminal 
3. **Enhanced Gas Estimation**: Detailed gas estimation with comprehensive error reporting
4. **Chainlink Setup Tests**: Complete configuration validation

## Using the Web UI Diagnostics

When submitting an assessment that uses Chainlink Functions, you'll see a **Diagnostics** button next to the submit button. This provides:

- Authorization status checks
- Subscription ID validation
- Source code presence verification
- Gas estimation testing

### How to Use:

1. Navigate to an assessment that uses Chainlink Functions
2. Click the **Diagnostics** button
3. Review the results and follow any suggested fixes

## Using Command-line Diagnostics

For more detailed diagnostics, we provide several command-line tools:

### Comprehensive Chainlink Diagnostics

```bash
npm run chainlink:diagnose
```

This command:
- Validates contract connections
- Checks authorization status
- Verifies Chainlink configuration (DON ID, Subscription ID)
- Tests source code presence
- Attempts gas estimation with a test submission
- Provides detailed error messages and fix suggestions

### Test Chainlink Setup

```bash
npm run test:chainlink-setup
```

This command focuses on the Chainlink configuration without attempting submission:
- Checks contract ownership
- Validates authorization between contracts
- Verifies Chainlink configuration values

### Test Gas Estimation

```bash
npm run test:gas-estimate
```

This command tests the gas estimation for assessment submission:
- Creates a test submission
- Checks if gas estimation succeeds
- Provides detailed error information if it fails

## Common Issues and Solutions

### Authorization Error

**Symptom**: Error message "Caller not authorized"

**Solution**: 
```bash
npx hardhat setup-chainlink-connection --network baseSepoliaTestnet
```

### Missing Source Code

**Symptom**: Error message "Source code not set" or "Error accessing source code"

**Solution**: 
```bash
npx hardhat update-chainlink --network baseSepoliaTestnet
```

### Missing Subscription ID

**Symptom**: Error message "Subscription ID is not set"

**Solution**: 
```bash
npx hardhat update-chainlink --network baseSepoliaTestnet
```

### Assessment Already Being Verified

**Symptom**: Error message "Assessment is already in 'Verifying' state"

**Solution**: Wait for verification to complete or:
```bash
npm run restart-assessment [QUESTION_SET_ID]
```

### Insufficient Funds

**Symptom**: Error message "Insufficient funds"

**Solution**: Get testnet ETH from:
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)

## Troubleshooting the Verifier Contract

If you need to debug issues with the ChainlinkAnswerVerifier contract itself:

1. Check if the contract is correctly set in QuestionManager:
   ```bash
   npx hardhat run scripts/test-chainlink-setup.js
   ```

2. Verify the contract is added as a consumer in your Chainlink subscription:
   - Visit [Chainlink Functions UI](https://functions.chain.link/base-sepolia)
   - Navigate to your subscription
   - Check if your verifier contract address is in the consumers list
   - If not, add it using "Add Consumer" button

3. Test the evaluation source code:
   ```bash
   npm run test:chainlink-source
   ```

## Advanced: Custom Contract Test Functions

In `src/utils/contractTestUtils.js`, we've added several functions for advanced debugging:

- `testChainlinkSetup()`: Comprehensive setup validation
- `submitWithGasEstimate()`: Enhanced gas estimation with detailed diagnostics
- `checkVerifierSetup()`: Checks verifier contract configuration

## Need More Help?

If you're still encountering issues after using these diagnostic tools:

1. Check the browser console for detailed error logs
2. Run `npm run chainlink:diagnose` and save the output
3. Verify your Base Sepolia RPC URL is working correctly
4. Ensure your wallet has sufficient ETH for gas fees

For questions or further assistance, please contact support or file an issue in the project repository. 