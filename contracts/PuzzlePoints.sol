// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title PuzzlePoints
/// @notice A non-transferable ERC20 token that represents reward points.
contract PuzzlePoints is ERC20, Ownable {
    
    constructor() ERC20("Puzzle Points", "PP") {
        // Manually set the owner (in OpenZeppelin 4.9.3, Ownable constructor doesn't take parameters)
        _transferOwnership(msg.sender);
    }

    // Override the _transfer function to restrict transfers
    function _transfer(address from, address to, uint256 amount) internal override {
        // Allow minting (from == address(0)) and burning (to == address(0)) only.
        if (from != address(0) && to != address(0)) {
            revert("Points are non-transferable");
        }
        super._transfer(from, to, amount);
    }

    // Allow only owner to mint points.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
