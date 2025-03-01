import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { ethers } from 'ethers';

const Leaderboard = ({ puzzlePoints, account }) => {
  const [loading, setLoading] = useState(true);
  const [holders, setHolders] = useState([]);
  const [totalHolders, setTotalHolders] = useState(0);
  const [error, setError] = useState(null);

  // Function to fetch leaderboard data using the on-chain enumeration
  const fetchLeaderboardData = async () => {
    if (!puzzlePoints) {
      setError('PZL token contract not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use the getHolderCount method to get total holders
      const holderCount = await puzzlePoints.getHolderCount();
      setTotalHolders(holderCount.toNumber());

      // Use getTopHolders to get top 50 holders (sorted by balance)
      const [addresses, balances] = await puzzlePoints.getTopHolders(50);
      
      // Map to holder objects
      const holdersArray = addresses.map((address, index) => ({
        address,
        balance: ethers.utils.formatUnits(balances[index], 18),
        rawBalance: balances[index]
      }));

      setHolders(holdersArray);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      
      // Check if error is due to the contract not supporting enumeration
      if (error.message.includes("not a function") || error.message.includes("is not a function")) {
        setError("This version of the PZL token contract doesn't support enumeration. Please upgrade the contract to use the more efficient enumeration methods.");
      } else {
        setError(`Error fetching leaderboard data: ${error.message}`);
      }
      
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchLeaderboardData();
  }, [puzzlePoints]);

  // Shorten address for display
  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card className="mt-4 mb-4">
      <Card.Header as="h5">
        PZL Token Leaderboard
        {totalHolders > 0 && (
          <Badge bg="primary" className="ms-2">
            {totalHolders} Holder{totalHolders !== 1 ? 's' : ''}
          </Badge>
        )}
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading leaderboard data...</p>
          </div>
        ) : (
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th className="text-end">PZL Balance</th>
              </tr>
            </thead>
            <tbody>
              {holders.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center">No holders found</td>
                </tr>
              ) : (
                holders.map((holder, index) => {
                  // Check if this holder is the connected account (case-insensitive comparison)
                  const isConnectedAccount = account && 
                    holder.address.toLowerCase() === account.toLowerCase();
                  
                  return (
                    <tr 
                      key={holder.address} 
                      className={isConnectedAccount ? "table-primary" : ""}
                      style={isConnectedAccount ? { fontWeight: 'bold' } : {}}
                    >
                      <td>{index + 1}</td>
                      <td>
                        {shortenAddress(holder.address)}
                        {isConnectedAccount && 
                          <Badge bg="info" className="ms-2">You</Badge>
                        }
                      </td>
                      <td className="text-end">{parseFloat(holder.balance).toFixed(2)} PZL</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default Leaderboard; 