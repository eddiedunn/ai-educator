// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/**
 * @title MockRouter
 * @dev Mock implementation of the Chainlink Functions Router for testing
 */
contract MockRouter {
    // Returns a fixed request ID for testing
    function sendRequest(
        uint64, // subscriptionId - unused
        bytes calldata, // data - unused
        uint32, // gasLimit - unused
        bytes32 // donId - unused
    ) external pure returns (bytes32) {
        // Ignore inputs and return a fixed request ID
        return bytes32(0x1234567890123456789012345678901234567890123456789012345678901234);
    }
    
    // Mock implementation for checking request status
    function getRequestStatus(bytes32) // requestId - unused
        external 
        view // Changed from pure to view because of block.timestamp usage
        returns (uint64, uint8, bytes memory) {
        // Return mock values: timestamp, status, result
        return (uint64(block.timestamp), 1, abi.encode("90,0x1234"));
    }
} 