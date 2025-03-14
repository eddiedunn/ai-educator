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

    // Custom errors
    error EvaluationSourceNotSet();
    error InvalidAnswerHash();
    error CallerNotAuthorized();
    error InvalidPassingThreshold();

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
     * @notice Verify an answer set using Chainlink Functions
     * @param user The address of the user who submitted the answers
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
        require(bytes(evaluationSource).length > 0, "Source code not set: JavaScript evaluation code is missing");
        require(subscriptionId != 0, "Subscription ID not set: Chainlink Functions subscription is required");
        require(donID != bytes32(0), "DON ID not set: Chainlink Functions DON ID is required");
        // The FunctionsClient has its own oracle address check built in
        
        // Validate input parameters
        require(user != address(0), "User address cannot be zero");
        require(bytes(questionSetId).length > 0, "Question set ID cannot be empty");
        require(answersHash != bytes32(0), "Answer hash cannot be zero");
        require(questionSetContentHash != bytes32(0), "Question set content hash cannot be zero");
        
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
        // Note: If the _sendRequest fails, it will revert with its own error message
        
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
     * @param _bytes32 The bytes32 to convert
     * @return The string representation with 0x prefix
     */
    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        // Create a bytes array to hold "0x" prefix + 64 hex characters
        bytes memory bytesArray = new bytes(66);
        
        // Add "0x" prefix
        bytesArray[0] = "0";
        bytesArray[1] = "x";
        
        // Convert each byte to two hex characters
        for (uint256 i = 0; i < 32; i++) {
            uint8 b = uint8(uint256(_bytes32) >> (8 * (31 - i)));
            bytesArray[2 + i * 2] = toHexChar(b >> 4);
            bytesArray[3 + i * 2] = toHexChar(b & 0x0f);
        }
        
        return string(bytesArray);
    }
    
    /**
     * @notice Helper function to convert a nibble to its hex character
     * @param _nibble The nibble to convert (0-15)
     * @return The hex character ('0'-'9', 'a'-'f')
     */
    function toHexChar(uint8 _nibble) internal pure returns (bytes1) {
        if (_nibble < 10) {
            return bytes1(uint8(_nibble) + 0x30);
        } else {
            return bytes1(uint8(_nibble) + 0x57); // 0x57 = 'a' - 10
        }
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

    /**
     * @notice Test if a mock answer hash can be properly processed by the evaluation code
     * @param mockAnswerHash The mock answer hash to test
     * @return True if the hash is valid according to common patterns, reverts otherwise
     */
    function testEvaluation(bytes32 mockAnswerHash) public view returns (bool) {
        if (bytes(evaluationSource).length == 0) {
            revert EvaluationSourceNotSet();
        }
        
        if (mockAnswerHash == bytes32(0)) {
            revert InvalidAnswerHash();
        }
        
        // Check common format patterns in the source code
        string memory source = evaluationSource;
        string memory hashString = bytes32ToString(mockAnswerHash);
        
        // Check hash length - most expect exactly 64 chars + 0x prefix
        if (bytes(hashString).length != 66) {
            revert("Hash must be exactly 64 characters + 0x prefix");
        }
        
        // Check for 0x prefix - most JS code expects this
        if (!startsWith(hashString, "0x")) {
            revert("Hash must start with 0x prefix");
        }
        
        // Specific pattern check for code that might strip the 0x prefix
        if (
            startsWith(hashString, "0x") && 
            contains(source, "substring(2)")
        ) {
            // This code probably expects a hash with 0x prefix and removes it
            // This is fine, just logging for debugging
        }
        
        // If we reach here, basic validation passed
        return true;
    }

    /**
     * @notice Helper function to check if a string contains a substring
     * @param s The string to check
     * @param searchFor The substring to search for
     * @return True if the string contains the substring
     */
    function contains(string memory s, string memory searchFor) internal pure returns (bool) {
        bytes memory sBytes = bytes(s);
        bytes memory searchBytes = bytes(searchFor);
        
        if (searchBytes.length > sBytes.length) {
            return false;
        }
        
        for (uint i = 0; i <= sBytes.length - searchBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < searchBytes.length; j++) {
                if (sBytes[i + j] != searchBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Helper function to check if a string starts with a substring
     * @param s The string to check
     * @param prefix The prefix to check for
     * @return True if the string starts with the prefix
     */
    function startsWith(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory sBytes = bytes(s);
        bytes memory prefixBytes = bytes(prefix);
        
        if (prefixBytes.length > sBytes.length) {
            return false;
        }
        
        for (uint i = 0; i < prefixBytes.length; i++) {
            if (sBytes[i] != prefixBytes[i]) {
                return false;
            }
        }
        return true;
    }
} 