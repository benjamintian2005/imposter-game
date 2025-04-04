import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function Lobby({ socket, gameState, setGameState }) {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [copied, setCopied] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  // Debug logs
  console.log('Lobby rendered with gameState:', gameState);
  console.log('URL roomId:', roomId);
  console.log('Socket ID:', socket.id);

  useEffect(() => {
    // Verify room ID matches
    if (roomId !== gameState.roomId) {
      console.log('Room ID mismatch, redirecting to home');
      navigate('/');
      return;
    }

    // Set up socket listeners for the lobby
    const handlePlayerJoined = ({ players }) => {
      console.log('Player joined event received in Lobby:', players);
      setGameState(prev => ({ ...prev, players }));
      setIsLoading(false);
    };

    const handlePlayerLeft = ({ players }) => {
      console.log('Player left event received in Lobby:', players);
      setGameState(prev => ({ ...prev, players }));
    };

    const handleGameReady = () => {
      console.log('Game ready event received in Lobby');
      setGameState(prev => ({ ...prev, gameStatus: 'ready' }));
    };

    const handleError = ({ message }) => {
      console.error('Lobby error:', message);
      if (message.includes('Room not found')) {
        navigate('/');
      }
    };

    // Add event listeners
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('gameReady', handleGameReady);
    socket.on('error', handleError);

    // If we already have players in the game state, we're not loading
    if (gameState.players && gameState.players.length > 0) {
      console.log('Already have players, not loading');
      setIsLoading(false);
    } else {
      // Request room data from server
      console.log('Requesting room data from server');
      socket.emit('getRoomData', { roomId });
    }

    // Clean up listeners
    return () => {
      console.log('Cleaning up socket listeners in Lobby');
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('gameReady', handleGameReady);
      socket.off('error', handleError);
    };
  }, [socket, roomId, gameState.roomId, navigate, setGameState, gameState.players]);

  useEffect(() => {
    if (gameState.gameStatus === 'ready') {
      console.log('Game is ready, navigating to game');
      navigate(`/game/${gameState.roomId}`);
    }
  }, [gameState.gameStatus, gameState.roomId, navigate]);

  const handleStartGame = () => {
    console.log('Starting game with settings:', { maxPlayers, rounds });
    socket.emit('startGame', { 
      roomId: gameState.roomId,
      maxPlayers,
      rounds
    });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(gameState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    console.log('Leaving room:', gameState.roomId);
    socket.emit('leaveRoom', { roomId: gameState.roomId });
    setGameState(prev => ({
      ...prev,
      roomId: null,
      playerName: '',
      players: []
    }));
    navigate('/');
  };

  const isHost = gameState.players && gameState.players.length > 0 && gameState.players[0]?.id === socket.id;

  // Show loading state if we're still loading
  if (isLoading) {
    return (
      <div className="lobby-container">
        <div className="loading-message">Loading lobby...</div>
      </div>
    );
  }

  // If we don't have players yet, show a message
  if (!gameState.players || gameState.players.length === 0) {
    return (
      <div className="lobby-container">
        <div className="lobby-header">
          <h1>Game Lobby</h1>
          <button className="leave-room-btn" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>
        <div className="room-info">
          <div className="room-id-section">
            <h2>Room ID: <span className="room-id">{gameState.roomId}</span></h2>
            <button 
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyRoomId}
            >
              {copied ? 'Copied!' : 'Copy Room ID'}
            </button>
          </div>
        </div>
        <div className="waiting-message">Waiting for players to join...</div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>Game Lobby</h1>
        <button className="leave-room-btn" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>

      <div className="room-info">
        <div className="room-id-section">
          <h2>Room ID: <span className="room-id">{gameState.roomId}</span></h2>
          <button 
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyRoomId}
          >
            {copied ? 'Copied!' : 'Copy Room ID'}
          </button>
        </div>
      </div>

      <div className="players-section">
        <h2>Players ({gameState.players.length}/{maxPlayers})</h2>
        <div className="players-grid">
          {gameState.players.map((player) => (
            <div key={player.id} className="player-card">
              <span className="player-name">{player.name}</span>
              {player.id === socket.id && <span className="you-badge">(You)</span>}
            </div>
          ))}
          {[...Array(maxPlayers - gameState.players.length)].map((_, index) => (
            <div key={`empty-${index}`} className="player-card empty">
              <span className="player-name">Waiting...</span>
            </div>
          ))}
        </div>
      </div>

      {isHost && gameState.players.length >= 2 && (
        <div className="game-settings">
          <h2>Game Settings</h2>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Max Players:</label>
              <select 
                value={maxPlayers} 
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              >
                {[4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>Number of Rounds:</label>
              <select 
                value={rounds} 
                onChange={(e) => setRounds(Number(e.target.value))}
              >
                {[3, 4, 5, 6, 7].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="game-controls">
        {isHost && gameState.players.length >= 2 && (
          <button 
            className="start-game-btn"
            onClick={handleStartGame}
            disabled={gameState.players.length < 2}
          >
            Start Game
          </button>
        )}
        {!isHost && gameState.players.length >= 2 && (
          <p className="waiting-message">Waiting for host to start the game...</p>
        )}
        {gameState.players.length < 2 && (
          <p className="waiting-message">Waiting for more players to join...</p>
        )}
      </div>
    </div>
  );
}

export default Lobby; 