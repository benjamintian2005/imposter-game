import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

// Create socket connection with debug logs
const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

// Debug socket events
socket.on('connect', () => {
  console.log('Socket connected in App.js, ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error in App.js:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected in App.js:', reason);
});

function App() {
  const [gameState, setGameState] = useState({
    roomId: null,
    playerName: '',
    players: [],
    currentRound: 0,
    question: '',
    timeLeft: 0,
    isImposter: false,
    gameStatus: 'waiting'
  });

  // Debug game state changes
  useEffect(() => {
    console.log('Game state updated in App.js:', gameState);
  }, [gameState]);

  useEffect(() => {
    const handlePlayerJoined = ({ players }) => {
      console.log('playerJoined event received in App.js:', players);
      setGameState(prev => ({ ...prev, players }));
    };

    const handleGameReady = () => {
      console.log('gameReady event received in App.js');
      setGameState(prev => ({ ...prev, gameStatus: 'ready' }));
    };

    const handleNewRound = ({ question, roundNumber, timeLimit }) => {
      console.log('newRound event received in App.js:', { question, roundNumber, timeLimit });
      setGameState(prev => ({
        ...prev,
        question,
        currentRound: roundNumber,
        timeLeft: timeLimit,
        gameStatus: 'answering'
      }));
    };

    const handleAllAnswersSubmitted = ({ answers }) => {
      console.log('allAnswersSubmitted event received in App.js:', answers);
      setGameState(prev => ({
        ...prev,
        answers,
        gameStatus: 'voting'
      }));
    };

    const handleRoundEnd = ({ imposter, scores }) => {
      console.log('roundEnd event received in App.js:', { imposter, scores });
      setGameState(prev => ({
        ...prev,
        scores,
        gameStatus: 'roundEnd'
      }));
    };

    const handleGameEnd = ({ winner }) => {
      console.log('gameEnd event received in App.js:', winner);
      setGameState(prev => ({
        ...prev,
        gameStatus: 'ended',
        winner
      }));
    };

    // Add event listeners
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameReady', handleGameReady);
    socket.on('newRound', handleNewRound);
    socket.on('allAnswersSubmitted', handleAllAnswersSubmitted);
    socket.on('roundEnd', handleRoundEnd);
    socket.on('gameEnd', handleGameEnd);

    // Clean up listeners
    return () => {
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('gameReady', handleGameReady);
      socket.off('newRound', handleNewRound);
      socket.off('allAnswersSubmitted', handleAllAnswersSubmitted);
      socket.off('roundEnd', handleRoundEnd);
      socket.off('gameEnd', handleGameEnd);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                socket={socket} 
                gameState={gameState} 
                setGameState={setGameState} 
              />
            } 
          />
          <Route 
            path="/lobby/:roomId" 
            element={
              gameState.roomId ? (
                <Lobby 
                  socket={socket} 
                  gameState={gameState} 
                  setGameState={setGameState} 
                />
              ) : (
                <Navigate to="/" />
              )
            } 
          />
          <Route 
            path="/game/:roomId" 
            element={
              gameState.roomId ? (
                <Game 
                  socket={socket} 
                  gameState={gameState} 
                  setGameState={setGameState} 
                />
              ) : (
                <Navigate to="/" />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 