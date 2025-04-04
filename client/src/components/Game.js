import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Game({ socket, gameState, setGameState }) {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    if (gameState.gameStatus === 'answering') {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState.gameStatus]);

  useEffect(() => {
    if (gameState.gameStatus === 'ended') {
      navigate('/');
    }
  }, [gameState.gameStatus, navigate]);

  const handleSubmitAnswer = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    socket.emit('submitAnswer', {
      roomId: gameState.roomId,
      answer
    });
  };

  const handleVote = (playerId) => {
    setSelectedPlayer(playerId);
    socket.emit('vote', {
      roomId: gameState.roomId,
      votedPlayerId: playerId
    });
  };

  const renderGameContent = () => {
    switch (gameState.gameStatus) {
      case 'answering':
        return (
          <div className="answering-phase">
            <h2>Round {gameState.currentRound}</h2>
            <div className="timer">Time left: {timer}s</div>
            <div className="question">
              <h3>Your Question:</h3>
              <p>{gameState.question}</p>
            </div>
            <form onSubmit={handleSubmitAnswer}>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={timer === 0}
              />
              <button type="submit" disabled={timer === 0}>
                Submit Answer
              </button>
            </form>
          </div>
        );

      case 'voting':
        return (
          <div className="voting-phase">
            <h2>Vote for the Imposter</h2>
            <div className="answers-list">
              {gameState.answers.map(({ playerId, playerName, answer }) => (
                <div key={playerId} className="answer-card">
                  <span className="player-name">{playerName}</span>
                  <p className="answer">{answer}</p>
                </div>
              ))}
            </div>
            <div className="players-grid">
              {gameState.players.map((player) => (
                <button
                  key={player.id}
                  className={`player-vote-btn ${selectedPlayer === player.id ? 'selected' : ''}`}
                  onClick={() => handleVote(player.id)}
                  disabled={selectedPlayer !== null}
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>
        );

      case 'roundEnd':
        return (
          <div className="round-end">
            <h2>Round {gameState.currentRound} Results</h2>
            <div className="scores">
              {gameState.scores.map(({ playerName, score }) => (
                <div key={playerName} className="score-card">
                  <span className="player-name">{playerName}</span>
                  <span className="score">{score} points</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div>Loading...</div>;
    }
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Imposter Game</h1>
        <div className="room-info">
          Room: {gameState.roomId}
        </div>
      </div>
      {renderGameContent()}
    </div>
  );
}

export default Game; 