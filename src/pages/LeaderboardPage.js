import React from 'react';
import { Container, Card } from 'react-bootstrap';
import Leaderboard from '../components/admin/Leaderboard';

const LeaderboardPage = ({ puzzlePoints }) => {
  return (
    <Container className="mt-4">
      <Card className="mb-4">
        <Card.Header as="h3">PZL Token Leaderboard</Card.Header>
        <Card.Body>
          <p className="mb-4">
            This leaderboard displays the top PZL token holders in descending order of their balance.
            PZL tokens are earned by successfully completing assessments.
          </p>
        </Card.Body>
      </Card>
      
      <Leaderboard puzzlePoints={puzzlePoints} />
    </Container>
  );
};

export default LeaderboardPage; 