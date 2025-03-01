// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title IPuzzlePointsEnumerable
 * @dev Interface for the enumerable extension of PZL Token
 */
interface IPuzzlePointsEnumerable {
    /**
     * @dev Emitted when a new holder is added to the holders list
     */
    event HolderAdded(address indexed holder);
    
    /**
     * @dev Emitted when a holder is removed from the holders list
     */
    event HolderRemoved(address indexed holder);

    /**
     * @dev Returns the total number of token holders
     */
    function getHolderCount() external view returns (uint256);
    
    /**
     * @dev Returns whether the given address is in the holders list
     */
    function isHolder(address account) external view returns (bool);
    
    /**
     * @dev Returns a paginated list of holders and their balances
     * @param offset Starting index
     * @param limit Maximum number of items to return
     * @return addresses Array of holder addresses
     * @return balances Array of holder balances
     */
    function getHolders(uint256 offset, uint256 limit) external view returns (address[] memory addresses, uint256[] memory balances);
    
    /**
     * @dev Returns the top N holders sorted by balance
     * @param count Number of top holders to return
     * @return addresses Array of holder addresses
     * @return balances Array of holder balances
     * Note: This is gas-intensive and should only be used for small values of N
     */
    function getTopHolders(uint256 count) external view returns (address[] memory addresses, uint256[] memory balances);
} 