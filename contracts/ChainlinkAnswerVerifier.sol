// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainlinkAnswerVerifier
 * @notice Uses Chainlink Functions to verify answer sets using advanced evaluation logic with LLM integration
 * @dev This contract handles the off-chain verification of answer sets using JavaScript and OpenAI
 */
contract ChainlinkAnswerVerifier is FunctionsClient, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;

    // Authorized callers mapping
    mapping(address => bool) public authorizedCallers;
    
    // Configuration
    bytes32 public donID;        // DON ID for Chainlink Functions
    uint64 public subscriptionId; // Subscription ID for billing
    uint32 public gasLimit = 300000;
    
    // Threshold for passing score (0-100)
    uint256 public passingScoreThreshold = 70;
    
    // Source code & secrets
    string public evaluationSource; // JavaScript source code for evaluation
    bytes public secrets;          // Encrypted secrets for API access if needed
    
    // Mapping from requestId to answer verification request details
    struct VerificationRequest {
        address user;
        string questionSetId;
        bytes32 answersHash;
        bool fulfilled;
        uint256 score;           // Score from 0-100
        bytes32 resultsHash;     // Hash of the detailed results JSON
    }
    
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    
    // Events
    event VerificationRequested(bytes32 indexed requestId, address indexed user, string indexed questionSetId, bytes32 answersHash);
    event VerificationFulfilled(bytes32 indexed requestId, uint256 score, bytes32 resultsHash);
    event ConfigUpdated(uint64 subscriptionId, bytes secrets, bytes32 donID);
    event SourceCodeUpdated(string source);
    event PassingScoreThresholdUpdated(uint256 threshold);
    event CallerAdded(address caller);
    event CallerRemoved(address caller);
    
    /**
     * @notice Constructor sets the Chainlink router address
     * @param router The address of the Chainlink Functions router
     * @param donId The DON ID for Chainlink Functions
     */
    constructor(address router, bytes32 donId) FunctionsClient(router) {
        // Manually set the owner (in OpenZeppelin 4.9.3, Ownable constructor doesn't take parameters)
        _transferOwnership(msg.sender);
        
        // Store the DON ID
        donID = donId;
    }
    
    /**
     * @notice Add a contract that can call the verification function
     * @param callerAddress Address to authorize as a caller
     */
    function addCaller(address callerAddress) external onlyOwner {
        authorizedCallers[callerAddress] = true;
        emit CallerAdded(callerAddress);
    }
    
    /**
     * @notice Remove a contract from the authorized callers
     * @param callerAddress Address to remove from authorized callers
     */
    function removeCaller(address callerAddress) external onlyOwner {
        authorizedCallers[callerAddress] = false;
        emit CallerRemoved(callerAddress);
    }
    
    /**
     * @notice Modifier to restrict function calls to authorized callers
     */
    modifier onlyCaller() {
        require(authorizedCallers[msg.sender], "Caller not authorized");
        _;
    }
    
    /**
     * @notice Set the passing score threshold (0-100)
     * @param threshold New threshold value
     */
    function setPassingScoreThreshold(uint256 threshold) external onlyOwner {
        require(threshold <= 100, "Threshold must be 0-100");
        passingScoreThreshold = threshold;
        emit PassingScoreThresholdUpdated(threshold);
    }
    
    /**
     * @notice Update the Chainlink Functions subscription details
     * @param _subscriptionId Chainlink Functions subscription ID
     * @param _secrets Encrypted secrets for API access
     * @param _donId DON ID for Chainlink Functions
     */
    function updateConfig(
        uint64 _subscriptionId,
        bytes calldata _secrets,
        bytes32 _donId
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        secrets = _secrets;
        donID = _donId;
        emit ConfigUpdated(_subscriptionId, _secrets, _donId);
    }
    
    /**
     * @notice Update the JavaScript source code for answer evaluation
     * @param source New source code
     */
    function updateEvaluationSource(string calldata source) external onlyOwner {
        evaluationSource = source;
        emit SourceCodeUpdated(source);
    }
    
    /**
     * @notice Verify a set of answers using Chainlink Functions
     * @param user User who submitted the answers
     * @param questionSetId ID of the question set
     * @param answersHash Hash of the answers JSON blob
     * @param questionSetContentHash Hash of the question set content for verification
     * @return requestId The unique identifier for this verification request
     */
    function verifyAnswerSet(
        address user,
        string calldata questionSetId,
        bytes32 answersHash,
        bytes32 questionSetContentHash
    ) external onlyCaller returns (bytes32 requestId) {
        // Require that source code has been set
        require(bytes(evaluationSource).length > 0, "Source code not set");
        require(subscriptionId != 0, "Subscription ID not set");
        
        // Initialize the Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequest(FunctionsRequest.Location.Inline, FunctionsRequest.CodeLanguage.JavaScript, evaluationSource);
        
        // Add arguments for the JS code
        string[] memory args = new string[](3);
        args[0] = questionSetId;
        args[1] = bytes32ToString(answersHash);
        args[2] = bytes32ToString(questionSetContentHash);
        req.setArgs(args);
        
        // Add encrypted secrets if they exist
        if (secrets.length > 0) {
            req.addSecretsReference(secrets);
        }
        
        // Send the request to Chainlink Functions
        bytes32 _requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );
        
        // Store the verification request details
        verificationRequests[_requestId] = VerificationRequest({
            user: user,
            questionSetId: questionSetId,
            answersHash: answersHash,
            fulfilled: false,
            score: 0,
            resultsHash: bytes32(0)
        });
        
        emit VerificationRequested(_requestId, user, questionSetId, answersHash);
        
        return _requestId;
    }
    
    /**
     * @notice Callback function for Chainlink Functions
     * @param requestId The ID of the request
     * @param response The response from the JavaScript code (format: "score,resultsHash")
     * @param err Any error that occurred
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        VerificationRequest storage request = verificationRequests[requestId];
        
        // Mark as fulfilled
        request.fulfilled = true;
        
        // Handle errors
        if (err.length > 0) {
            request.score = 0;
            emit VerificationFulfilled(requestId, 0, bytes32(0));
            return;
        }
        
        // Parse the response - expected format: "score,resultsHash" where score is 0-100
        string memory responseStr = string(response);
        bytes memory responseBytes = bytes(responseStr);
        
        // Extract score - everything before the first comma
        uint256 score = 0;
        uint256 commaIndex = 0;
        
        // Find the first comma
        for (uint256 i = 0; i < responseBytes.length; i++) {
            if (responseBytes[i] == bytes1(',')) {
                commaIndex = i;
                break;
            }
        }
        
        // Parse the score (assuming it's a number between 0-100)
        if (commaIndex > 0) {
            uint256 temp = 0;
            for (uint256 i = 0; i < commaIndex; i++) {
                uint8 digit = uint8(responseBytes[i]) - 48; // Convert ASCII to number
                if (digit < 10) {
                    temp = temp * 10 + digit;
                }
            }
            // Ensure score is between 0-100
            score = temp > 100 ? 100 : temp;
        }
            
        // Extract resultsHash - everything after the first comma
        bytes32 resultsHash = bytes32(0);
        
        if (commaIndex > 0 && responseBytes.length > commaIndex + 1) {
            string memory hashStr = "";
            bytes memory hashStrBytes = new bytes(responseBytes.length - (commaIndex + 1));
            for (uint256 i = 0; i < hashStrBytes.length; i++) {
                hashStrBytes[i] = responseBytes[i + commaIndex + 1];
            }
            hashStr = string(hashStrBytes);
            
            // Convert the string hash to bytes32
            resultsHash = stringToBytes32(hashStr);
        }
        
        // Update the verification request
        request.score = score;
        request.resultsHash = resultsHash;
        
        emit VerificationFulfilled(requestId, score, resultsHash);
    }
    
    /**
     * @notice Check if a verification request has been fulfilled
     * @param requestId The ID of the request to check
     * @return fulfilled Whether the request has been fulfilled
     * @return passed Whether the answer met the passing threshold
     * @return score The numeric score (0-100)
     * @return resultsHash Hash of the detailed results JSON
     */
    function checkVerification(bytes32 requestId) external view returns (
        bool fulfilled,
        bool passed,
        uint256 score,
        bytes32 resultsHash
    ) {
        VerificationRequest storage request = verificationRequests[requestId];
        return (
            request.fulfilled, 
            request.score >= passingScoreThreshold, 
            request.score, 
            request.resultsHash
        );
    }
    
    /**
     * @notice Get details about a verification request
     * @param requestId The ID of the request
     * @return The full VerificationRequest struct
     */
    function getVerificationRequest(bytes32 requestId) external view returns (VerificationRequest memory) {
        return verificationRequests[requestId];
    }
    
    /**
     * @notice Helper function to convert bytes32 to string
     * @param _bytes32 The bytes32 value to convert
     * @return string representation of the bytes32 value
     */
    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            bytesArray[i*2] = bytes1(uint8(uint256(_bytes32) / (2**(8*(31 - i)))));
            bytesArray[i*2+1] = bytes1(uint8(uint256(_bytes32) / (2**(8*(31 - i))) % 16));
        }
        return string(bytesArray);
    }
    
    /**
     * @notice Helper function to convert string to bytes32
     * @param source The string to convert
     * @return result The bytes32 representation
     */
    function stringToBytes32(string memory source) internal pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }
} 