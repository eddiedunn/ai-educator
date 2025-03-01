// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IPuzzlePointsEnumerable.sol";

/// @title PuzzlePoints
/// @notice A non-transferable ERC20 token that represents reward points with holder enumeration capabilities
contract PuzzlePoints is ERC20, Ownable, IPuzzlePointsEnumerable {
    // Array of all holder addresses
    address[] private _holderAddresses;
    
    // Mapping from address to its index in the _holderAddresses array + 1 (0 means not in array)
    mapping(address => uint256) private _holderIndices;
    
    constructor() ERC20("PZL Token", "PZL") {
        // Manually set the owner (in OpenZeppelin 4.9.3, Ownable constructor doesn't take parameters)
        _transferOwnership(msg.sender);
    }

    // Override the _transfer function to restrict transfers
    function _transfer(address from, address to, uint256 amount) internal override {
        // Allow minting (from == address(0)) and burning (to == address(0)) only.
        if (from != address(0) && to != address(0)) {
            revert("Tokens are non-transferable");
        }
        super._transfer(from, to, amount);
        
        // Handle the case of burning tokens (though unlikely in this token design)
        if (to == address(0) && balanceOf(from) == 0) {
            _removeHolder(from);
        }
    }

    // Allow only owner to mint points.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        
        // Add the recipient to the holders list if not already there and they have tokens
        if (amount > 0 && !_isHolderInternal(to)) {
            _addHolder(to);
        }
    }
    
    /**
     * @dev Add an address to the holders list
     */
    function _addHolder(address holder) private {
        require(holder != address(0), "Cannot add zero address as holder");
        
        _holderAddresses.push(holder);
        _holderIndices[holder] = _holderAddresses.length;
        
        emit HolderAdded(holder);
    }
    
    /**
     * @dev Remove an address from the holders list
     */
    function _removeHolder(address holder) private {
        require(_isHolderInternal(holder), "Address is not a holder");
        
        uint256 index = _holderIndices[holder] - 1;
        uint256 lastIndex = _holderAddresses.length - 1;
        
        if (index != lastIndex) {
            // Move the last address to the removed holder's spot
            address lastHolder = _holderAddresses[lastIndex];
            _holderAddresses[index] = lastHolder;
            _holderIndices[lastHolder] = index + 1;
        }
        
        // Remove the last element (which is now duplicated if there was a swap)
        _holderAddresses.pop();
        _holderIndices[holder] = 0;
        
        emit HolderRemoved(holder);
    }
    
    /**
     * @dev Internal function to check if an address is in the holders list
     */
    function _isHolderInternal(address account) private view returns (bool) {
        return _holderIndices[account] != 0;
    }
    
    // ====== ENUMERATION FUNCTIONS ======
    
    /**
     * @dev See {IPuzzlePointsEnumerable-getHolderCount}
     */
    function getHolderCount() external view override returns (uint256) {
        return _holderAddresses.length;
    }
    
    /**
     * @dev See {IPuzzlePointsEnumerable-isHolder}
     */
    function isHolder(address account) external view override returns (bool) {
        return _isHolderInternal(account);
    }
    
    /**
     * @dev See {IPuzzlePointsEnumerable-getHolders}
     */
    function getHolders(uint256 offset, uint256 limit) external view override returns (address[] memory addresses, uint256[] memory balances) {
        uint256 count = _holderAddresses.length;
        
        // Ensure offset is valid
        if (offset >= count) {
            return (new address[](0), new uint256[](0));
        }
        
        // Calculate actual limit (cap to array bounds)
        uint256 actualLimit = limit;
        if (offset + actualLimit > count) {
            actualLimit = count - offset;
        }
        
        // Create result arrays
        addresses = new address[](actualLimit);
        balances = new uint256[](actualLimit);
        
        // Fill result arrays
        for (uint256 i = 0; i < actualLimit; i++) {
            addresses[i] = _holderAddresses[offset + i];
            balances[i] = balanceOf(addresses[i]);
        }
        
        return (addresses, balances);
    }
    
    /**
     * @dev See {IPuzzlePointsEnumerable-getTopHolders}
     * WARNING: This function is gas-intensive for large values of count
     * Only use for small values (e.g., < 50) and with caution
     */
    function getTopHolders(uint256 count) external view override returns (address[] memory addresses, uint256[] memory balances) {
        uint256 holderCount = _holderAddresses.length;
        
        // Cap count to actual holder count
        if (count > holderCount) {
            count = holderCount;
        }
        
        // Create temporary arrays for sorting
        address[] memory tempAddresses = new address[](holderCount);
        uint256[] memory tempBalances = new uint256[](holderCount);
        
        // Fill temporary arrays
        for (uint256 i = 0; i < holderCount; i++) {
            tempAddresses[i] = _holderAddresses[i];
            tempBalances[i] = balanceOf(tempAddresses[i]);
        }
        
        // Sort by balance (simple bubble sort for demonstration)
        // Note: This is not gas-efficient for large arrays
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = i + 1; j < holderCount; j++) {
                if (tempBalances[j] > tempBalances[i]) {
                    // Swap balances
                    uint256 tmpBalance = tempBalances[i];
                    tempBalances[i] = tempBalances[j];
                    tempBalances[j] = tmpBalance;
                    
                    // Swap addresses
                    address tmpAddress = tempAddresses[i];
                    tempAddresses[i] = tempAddresses[j];
                    tempAddresses[j] = tmpAddress;
                }
            }
        }
        
        // Create result arrays with only the top count holders
        addresses = new address[](count);
        balances = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            addresses[i] = tempAddresses[i];
            balances[i] = tempBalances[i];
        }
        
        return (addresses, balances);
    }
}
