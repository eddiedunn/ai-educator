// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PuzzlePoints.sol";
import "./ChainlinkAnswerVerifier.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title QuestionManager
/// @notice Manages question sets and user assessments using content hashes for off-chain storage
contract QuestionManager is Ownable {
    // Maximum reward points per correct answer (for 100% score)
    uint256 public constant MAX_REWARD_AMOUNT = 1 * 10 ** 18;
    
    // Minimum score required to pass a question (0-100)
    uint256 public passingScoreThreshold = 70;

    // Optional: Reference to the PuzzlePoints contract for minting rewards
    PuzzlePoints public puzzlePoints;
    
    // Reference to the ChainlinkAnswerVerifier for advanced answer validation
    ChainlinkAnswerVerifier public answerVerifier;
    
    // Flag to determine if we should use Chainlink Functions for verification
    bool public useChainlinkFunctions = true;
    
    // ====== QUESTION SET MANAGEMENT ======
    // Question set metadata stored on-chain
    struct QuestionSetMetadata {
        string setId;
        bytes32 contentHash;  // Hash of the full JSON blob
        uint256 questionCount;
        uint256 timestamp;
        bool active;
    }

    // Mapping from question set ID to metadata
    mapping(string => QuestionSetMetadata) public questionSets;

    // Array to track all question set IDs
    string[] public questionSetIds;

    // Event emitted when a question set is submitted
    event QuestionSetSubmitted(
        string indexed questionSetId, 
        bytes32 contentHash, 
        uint256 questionCount,
        uint256 timestamp
    );
    // ====== END QUESTION SET MANAGEMENT ======

    // ====== USER ASSESSMENT MANAGEMENT ======
    // User assessment metadata stored on-chain
    struct UserAssessment {
        address user;
        string questionSetId;
        bytes32 answersHash;      // Hash of user's answers JSON blob
        bytes32 resultsHash;      // Hash of grading results JSON blob
        uint256 score;
        uint256 startTimestamp;
        uint256 completionTimestamp;
        bool completed;
        bytes32 pendingVerificationId; // If using Chainlink Functions, ID of the pending verification
    }

    // Mapping from user address to their current assessment
    mapping(address => UserAssessment) public userAssessments;

    // Events for assessment lifecycle
    event AssessmentStarted(
        address indexed user, 
        string questionSetId, 
        uint256 timestamp
    );

    event AnswersSubmitted(
        address indexed user, 
        bytes32 answersHash, 
        uint256 timestamp
    );

    event AssessmentCompleted(
        address indexed user, 
        bytes32 resultsHash, 
        uint256 score, 
        uint256 timestamp
    );
    
    event VerificationPending(
        address indexed user, 
        string questionSetId, 
        bytes32 requestId
    );
    // ====== END USER ASSESSMENT MANAGEMENT ======

    /// @notice Constructor initializes the contract with optional PuzzlePoints integration
    /// @param _puzzlePointsAddress Address of the PuzzlePoints token contract (optional)
    constructor(address _puzzlePointsAddress) {
        // Initialize PuzzlePoints integration if address is provided
        if (_puzzlePointsAddress != address(0)) {
            puzzlePoints = PuzzlePoints(_puzzlePointsAddress);
        }
        // Manually set the owner (in OpenZeppelin 4.9.3, Ownable constructor doesn't take parameters)
        _transferOwnership(msg.sender);
    }

    // ====== ADMIN FUNCTIONS ======
    
    /// @notice Set the ChainlinkAnswerVerifier contract
    /// @param verifierAddress Address of the verifier contract
    function setAnswerVerifier(address verifierAddress) external onlyOwner {
        answerVerifier = ChainlinkAnswerVerifier(verifierAddress);
        // Always enable Chainlink Functions when setting a verifier
        useChainlinkFunctions = true;
        emit AnswerVerifierSet(verifierAddress);
    }
    
    /// @notice Enable or disable Chainlink Functions for answer verification
    /// @param enabled Whether to use Chainlink Functions
    function setUseChainlinkFunctions(bool enabled) external onlyOwner {
        require(address(answerVerifier) != address(0) || !enabled, "Cannot enable without verifier");
        useChainlinkFunctions = enabled;
    }
    
    /// @notice Submit a question set with only the content hash
    /// @param setId Unique identifier for the question set
    /// @param contentHash Hash of the full JSON blob stored off-chain
    /// @param questionCount Number of questions in the set
    function submitQuestionSetHash(
        string memory setId,
        bytes32 contentHash,
        uint256 questionCount
    ) public onlyOwner {
        require(bytes(setId).length > 0, "Question set ID cannot be empty");
        require(contentHash != bytes32(0), "Content hash cannot be empty");
        require(questionCount > 0, "Question count must be greater than zero");
        
        // Check if this is a new question set
        bool isNew = bytes(questionSets[setId].setId).length == 0;
        
        // Update question set metadata
        QuestionSetMetadata storage metadata = questionSets[setId];
        metadata.setId = setId;
        metadata.contentHash = contentHash;
        metadata.questionCount = questionCount;
        metadata.timestamp = block.timestamp;
        metadata.active = true;
        
        // Add to the array of question sets if it's new
        if (isNew) {
            questionSetIds.push(setId);
        }
        
        // Emit event
        emit QuestionSetSubmitted(setId, contentHash, questionCount, block.timestamp);
    }
    
    /// @notice Deactivate a question set
    /// @param setId The ID of the question set to deactivate
    function deactivateQuestionSet(string memory setId) public onlyOwner {
        require(bytes(questionSets[setId].setId).length > 0, "Question set does not exist");
        questionSets[setId].active = false;
    }
    
    /// @notice Activate a previously deactivated question set
    /// @param setId The ID of the question set to activate
    function activateQuestionSet(string memory setId) public onlyOwner {
        require(bytes(questionSets[setId].setId).length > 0, "Question set does not exist");
        questionSets[setId].active = true;
    }
    
    /// @notice Submit evaluation results for a user's assessment
    /// @param user Address of the user
    /// @param resultsHash Hash of the evaluation results JSON stored off-chain
    /// @param score Total score earned (0-100)
    function submitEvaluationResults(
        address user,
        bytes32 resultsHash,
        uint256 score
    ) public onlyOwner {
        UserAssessment storage assessment = userAssessments[user];
        require(bytes(assessment.questionSetId).length > 0, "No active assessment");
        require(assessment.answersHash != bytes32(0), "No answers submitted");
        require(!assessment.completed, "Assessment already completed");
        
        // Update assessment with results
        assessment.resultsHash = resultsHash;
        assessment.score = score;
        assessment.completionTimestamp = block.timestamp;
        assessment.completed = true;
        
        // Award tokens if the score is above the passing threshold and PuzzlePoints is configured
        if (score >= passingScoreThreshold && address(puzzlePoints) != address(0)) {
            // Calculate tokens based on score percentage
            uint256 tokens = (score * MAX_REWARD_AMOUNT) / 100;
            puzzlePoints.mint(user, tokens);
        }
        
        // Emit completion event
        emit AssessmentCompleted(user, resultsHash, score, block.timestamp);
    }
    
    /// @notice Set the passing score threshold
    /// @param threshold New threshold value (0-100)
    function setPassingScoreThreshold(uint256 threshold) public onlyOwner {
        require(threshold <= 100, "Threshold must be between 0 and 100");
        passingScoreThreshold = threshold;
    }
    
    /// @notice Set the PuzzlePoints contract for rewards
    /// @param puzzlePointsAddr Address of the token contract
    function setPuzzlePoints(address puzzlePointsAddr) external onlyOwner {
        puzzlePoints = PuzzlePoints(puzzlePointsAddr);
    }
    // ====== END ADMIN FUNCTIONS ======
    
    // ====== USER FUNCTIONS ======
    
    /// @notice Start an assessment using questions from a specific question set
    /// @param questionSetId The ID of the question set to use
    function startAssessment(string memory questionSetId) public {
        require(bytes(questionSets[questionSetId].setId).length > 0, "Question set does not exist");
        require(questionSets[questionSetId].active, "Question set is not active");
        
        // Reset any existing assessment
        UserAssessment storage assessment = userAssessments[msg.sender];
        assessment.user = msg.sender;
        assessment.questionSetId = questionSetId;
        assessment.startTimestamp = block.timestamp;
        assessment.answersHash = bytes32(0);
        assessment.resultsHash = bytes32(0);
        assessment.score = 0;
        assessment.completionTimestamp = 0;
        assessment.completed = false;
        assessment.pendingVerificationId = bytes32(0);
        
        // Emit event
        emit AssessmentStarted(msg.sender, questionSetId, block.timestamp);
    }
    
    /// @notice Submit answers for the current assessment
    /// @param answersHash Hash of the answers JSON blob stored off-chain
    function submitAnswers(bytes32 answersHash) public {
        UserAssessment storage assessment = userAssessments[msg.sender];
        require(bytes(assessment.questionSetId).length > 0, "No active assessment");
        require(!assessment.completed, "Assessment already completed");
        require(answersHash != bytes32(0), "Answers hash cannot be empty");
        
        // Update assessment with answers hash
        assessment.answersHash = answersHash;
        
        // Emit event
        emit AnswersSubmitted(msg.sender, answersHash, block.timestamp);
        
        // If Chainlink Functions is enabled, automatically start verification
        if (useChainlinkFunctions && address(answerVerifier) != address(0)) {
            _startVerification(assessment);
        }
    }
    
    /// @notice Start a new assessment and submit answers in a single transaction
    /// @param questionSetId The ID of the question set to use
    /// @param answersHash Hash of the answers JSON blob stored off-chain
    function submitAssessmentAnswers(string memory questionSetId, bytes32 answersHash) public {
        // Check if question set exists and is active
        require(bytes(questionSets[questionSetId].setId).length > 0, "Question set does not exist");
        require(questionSets[questionSetId].active, "Question set is not active");
        require(answersHash != bytes32(0), "Answers hash cannot be empty");
        
        // Check if user already completed this assessment
        UserAssessment storage assessment = userAssessments[msg.sender];
        
        // If user already has a completed assessment for this question set, prevent resubmission
        if (bytes(assessment.questionSetId).length > 0 && 
            keccak256(bytes(assessment.questionSetId)) == keccak256(bytes(questionSetId)) && 
            assessment.completed) {
            revert("You have already completed this assessment");
        }
        
        // Reset assessment data
        assessment.user = msg.sender;
        assessment.questionSetId = questionSetId;
        assessment.startTimestamp = block.timestamp;
        assessment.answersHash = answersHash;
        assessment.resultsHash = bytes32(0);
        assessment.score = 0;
        assessment.completionTimestamp = 0;
        assessment.completed = false;
        assessment.pendingVerificationId = bytes32(0);
        
        // Emit both events
        emit AssessmentStarted(msg.sender, questionSetId, block.timestamp);
        emit AnswersSubmitted(msg.sender, answersHash, block.timestamp);
        
        // If Chainlink Functions is enabled, automatically start verification
        if (useChainlinkFunctions && address(answerVerifier) != address(0)) {
            _startVerification(assessment);
        }
    }
    
    /// @notice Manually trigger verification for the current assessment
    function triggerVerification() public {
        UserAssessment storage assessment = userAssessments[msg.sender];
        require(bytes(assessment.questionSetId).length > 0, "No active assessment");
        require(!assessment.completed, "Assessment already completed");
        require(assessment.answersHash != bytes32(0), "No answers submitted");
        require(useChainlinkFunctions && address(answerVerifier) != address(0), "Verification not enabled");
        
        // If there's a pending verification, check its status first
        if (assessment.pendingVerificationId != bytes32(0)) {
            _checkPendingVerification(assessment);
            // If still pending after check, prevent new verification
            require(assessment.pendingVerificationId == bytes32(0), "Previous verification still pending");
        }
        
        // Start a new verification
        _startVerification(assessment);
    }
    
    /// @notice Internal function to start verification with Chainlink Functions
    function _startVerification(UserAssessment storage assessment) internal {
        // Get the question set content hash
        bytes32 questionSetContentHash = questionSets[assessment.questionSetId].contentHash;
        
        // Send verification request to Chainlink Functions
        bytes32 requestId = answerVerifier.verifyAnswerSet(
            assessment.user,
            assessment.questionSetId,
            assessment.answersHash,
            questionSetContentHash
        );
        
        // Store the request ID
        assessment.pendingVerificationId = requestId;
        
        // Emit event
        emit VerificationPending(assessment.user, assessment.questionSetId, requestId);
    }
    
    /// @notice Check the result of a pending verification
    function checkPendingVerification() public {
        UserAssessment storage assessment = userAssessments[msg.sender];
        require(assessment.pendingVerificationId != bytes32(0), "No pending verification");
        
        _checkPendingVerification(assessment);
    }
    
    /// @notice Internal function to check a pending verification
    function _checkPendingVerification(UserAssessment storage assessment) internal {
        // Get the verification result from the verifier contract
        (bool fulfilled, bool unused, uint256 score, bytes32 resultsHash) = answerVerifier.checkVerification(
            assessment.pendingVerificationId
        );
        
        if (!fulfilled) return; // Still waiting for the result
        
        // Reset the pending verification
        assessment.pendingVerificationId = bytes32(0);
        
        // Update assessment with results
        assessment.resultsHash = resultsHash;
        assessment.score = score;
        assessment.completionTimestamp = block.timestamp;
        assessment.completed = true;
        
        // Award tokens if the score is above the passing threshold and PuzzlePoints is configured
        if (score >= passingScoreThreshold && address(puzzlePoints) != address(0)) {
            // Calculate tokens based on score percentage
            uint256 tokens = (score * MAX_REWARD_AMOUNT) / 100;
            puzzlePoints.mint(assessment.user, tokens);
        }
        
        // Emit completion event
        emit AssessmentCompleted(assessment.user, resultsHash, score, block.timestamp);
    }
    
    /// @notice Allow a user to restart and get a new assessment
    function restartAssessment() external {
        delete userAssessments[msg.sender];
    }
    // ====== END USER FUNCTIONS ======
    
    // ====== VIEW FUNCTIONS ======
    
    /// @notice Get all question set IDs
    /// @return Array of question set IDs
    function getQuestionSets() public view returns (string[] memory) {
        return questionSetIds;
    }
    
    /// @notice Get metadata for a specific question set
    /// @param questionSetId The ID of the question set
    /// @return metadata The question set metadata
    function getQuestionSetMetadata(string memory questionSetId) 
        public 
        view 
        returns (QuestionSetMetadata memory) 
    {
        return questionSets[questionSetId];
    }
    
    /// @notice Get active question sets
    /// @return Array of active question set IDs
    function getActiveQuestionSets() public view returns (string[] memory) {
        // Count active sets first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < questionSetIds.length; i++) {
            if (questionSets[questionSetIds[i]].active) {
                activeCount++;
            }
        }
        
        // Create and populate result array
        string[] memory activeSetIds = new string[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < questionSetIds.length; i++) {
            if (questionSets[questionSetIds[i]].active) {
                activeSetIds[index] = questionSetIds[i];
                index++;
            }
        }
        
        return activeSetIds;
    }
    
    /// @notice Check if a user has an active assessment
    /// @param user The user address to check
    /// @return hasAssessment True if user has an active assessment
    /// @return questionSetId The ID of the active assessment's question set
    /// @return completed Whether the assessment is completed
    function getUserAssessmentStatus(address user) 
        public 
        view 
        returns (
            bool hasAssessment, 
            string memory questionSetId, 
            bool completed
        ) 
    {
        UserAssessment storage assessment = userAssessments[user];
        hasAssessment = bytes(assessment.questionSetId).length > 0;
        questionSetId = assessment.questionSetId;
        completed = assessment.completed;
    }
    
    /// @notice Get the detailed assessment data for a user
    /// @param user The user address to check
    /// @return The user's assessment data
    function getUserAssessment(address user) 
        public 
        view 
        returns (UserAssessment memory) 
    {
        return userAssessments[user];
    }
    // ====== END VIEW FUNCTIONS ======
    
    // Event for tracking when the answer verifier is set
    event AnswerVerifierSet(address verifierAddress);
} 