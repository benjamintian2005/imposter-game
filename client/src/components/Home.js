import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home({ socket, gameState, setGameState }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');

  useEffect(() => {
    // Check socket connection
    console.log('Home component mounted, socket connected:', socket.connected);
    console.log('Current socket ID:', socket.id);
    
    socket.on('connect', () => {
      console.log('Socket connected in Home component. Socket ID:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error in Home:', error);
      setError('Connection error. Please try again.');
    });

    socket.on('roomCreated', ({ roomId }) => {
      console.log('Room created event received:', roomId);
      setCreatedRoomId(roomId);
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        roomId,
        playerName
      }));
      
      // Join the room after creating it
      console.log('Emitting joinRoom event for room:', roomId);
      socket.emit('joinRoom', { roomId, playerName });
    });

    socket.on('playerJoined', ({ players }) => {
      console.log('Player joined event received:', players);
      
      // Update game state with players
      setGameState(prev => ({
        ...prev,
        players
      }));
      
      // Navigate to lobby after successfully joining
      if (gameState.roomId) {
        console.log('Navigating to lobby for room:', gameState.roomId);
        navigate(`/lobby/${gameState.roomId}`);
      }
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error in Home:', message);
      setError(message);
    });

    return () => {
      console.log('Cleaning up socket listeners in Home');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('roomCreated');
      socket.off('playerJoined');
      socket.off('error');
    };
  }, [socket, playerName, setGameState, gameState.roomId, navigate]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    console.log('Creating room with name:', playerName);
    socket.emit('createRoom', { maxPlayers: 8, rounds: 5 });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim() || !roomId.trim()) {
      setError('Please enter both your name and room ID');
      return;
    }

    const upperRoomId = roomId.toUpperCase();
    console.log('Joining room:', upperRoomId, 'with name:', playerName);
    
    // Set game state before emitting join event
    setGameState(prev => ({
      ...prev,
      roomId: upperRoomId,
      playerName
    }));
    
    // Emit join room event
    socket.emit('joinRoom', { roomId: upperRoomId, playerName });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(createdRoomId);
    setError('Room ID copied to clipboard!');
    setTimeout(() => setError(''), 2000);
  };

  return (
    <div className="home-container">
      <h1>Imposter Game</h1>
      <div className="form-container">
        <form onSubmit={handleCreateRoom}>
          <h2>Create Room</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            required
          />
          <button type="submit">Create Room</button>
        </form>

        {createdRoomId && (
          <div className="room-id-display">
            <h3>Room Created!</h3>
            <p>Share this room ID with other players:</p>
            <div className="room-id-box">
              <span className="room-id">{createdRoomId}</span>
              <button onClick={copyRoomId} className="copy-btn">Copy</button>
            </div>
          </div>
        )}

        <div className="divider">or</div>

        <form onSubmit={handleJoinRoom}>
          <h2>Join Room</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            required
          />
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter room ID"
            required
          />
          <button type="submit">Join Room</button>
        </form>
      </div>
      {error && <div className={`error-message ${error.includes('copied') ? 'success' : ''}`}>{error}</div>}
    </div>
  );
}

export default Home; 