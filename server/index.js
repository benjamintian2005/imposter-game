const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game state
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  console.log('Current rooms:', Array.from(rooms.keys()));

  socket.on('createRoom', (roomData) => {
    console.log('Creating room with data:', roomData);
    console.log('Socket ID creating room:', socket.id);
    
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('Generated room ID:', roomId);
      
      rooms.set(roomId, {
        players: [],
        currentRound: 0,
        maxRounds: roomData.rounds || 5,
        maxPlayers: roomData.maxPlayers || 8,
        status: 'waiting',
        questions: generateQuestions(roomData.maxPlayers || 8)
      });
      
      socket.join(roomId);
      console.log('Room created and socket joined:', roomId);
      console.log('Current rooms after creation:', Array.from(rooms.keys()));
      
      socket.emit('roomCreated', { roomId });
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    console.log('Attempting to join room:', roomId, 'Player:', playerName);
    console.log('Socket ID joining room:', socket.id);
    console.log('Available rooms:', Array.from(rooms.keys()));
    
    const room = rooms.get(roomId);
    if (!room) {
      console.log('Room not found:', roomId);
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      console.log('Room is full:', roomId);
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      score: 0
    };

    room.players.push(player);
    socket.join(roomId);
    console.log('Player joined room:', roomId, 'Players:', room.players);
    
    io.to(roomId).emit('playerJoined', { players: room.players });

    if (room.players.length >= 2) {
      io.to(roomId).emit('gameReady');
    }
  });

  socket.on('getRoomData', ({ roomId }) => {
    console.log('Client requesting room data for:', roomId);
    const room = rooms.get(roomId);
    
    if (room) {
      console.log('Sending room data to client:', room);
      socket.emit('playerJoined', { players: room.players });
    } else {
      console.log('Room not found for data request:', roomId);
      socket.emit('error', { message: 'Room not found' });
    }
  });

  socket.on('leaveRoom', ({ roomId }) => {
    console.log('Player leaving room:', roomId, 'Socket:', socket.id);
    
    const room = rooms.get(roomId);
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);
        io.to(roomId).emit('playerLeft', { players: room.players });
        
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log('Room deleted:', roomId);
        }
      }
    }
  });

  socket.on('startGame', ({ roomId, maxPlayers, rounds }) => {
    console.log('Starting game in room:', roomId);
    
    const room = rooms.get(roomId);
    if (room) {
      room.maxPlayers = maxPlayers;
      room.maxRounds = rounds;
      room.status = 'playing';
      startRound(roomId);
    }
  });

  socket.on('submitAnswer', ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.answer = answer;
        checkAllAnswersSubmitted(roomId);
      }
    }
  });

  socket.on('vote', ({ roomId, votedPlayerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.vote = votedPlayerId;
        checkAllVotesSubmitted(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Handle player disconnection
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(roomId).emit('playerLeft', { players: room.players });
        
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log('Room deleted after disconnect:', roomId);
        }
      }
    });
  });
});

function generateQuestions(numPlayers) {
  // This is a placeholder. In a real implementation, you'd have a database of questions
  return [
    {
      normal: "What's your favorite color?",
      imposter: "What's your least favorite color?"
    },
    {
      normal: "What's your dream vacation destination?",
      imposter: "What's your worst vacation experience?"
    },
    {
      normal: "What's your favorite food?",
      imposter: "What's your least favorite food?"
    },
    {
      normal: "What's your ideal weekend activity?",
      imposter: "What's your worst weekend experience?"
    },
    {
      normal: "What's your favorite season?",
      imposter: "What's your least favorite season?"
    }
  ];
}

function startRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.currentRound++;
  const imposter = room.players[Math.floor(Math.random() * room.players.length)];
  imposter.isImposter = true;
  
  room.players.forEach(player => {
    const question = player.id === imposter.id ? 
      room.questions[room.currentRound - 1].imposter : 
      room.questions[room.currentRound - 1].normal;
    
    io.to(player.id).emit('newRound', {
      question,
      roundNumber: room.currentRound,
      timeLimit: 30
    });
  });
}

function checkAllAnswersSubmitted(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const allSubmitted = room.players.every(player => player.answer);
  if (allSubmitted) {
    io.to(roomId).emit('allAnswersSubmitted', {
      answers: room.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        answer: p.answer
      }))
    });
  }
}

function checkAllVotesSubmitted(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const allVoted = room.players.every(player => player.vote);
  if (allVoted) {
    const imposter = room.players.find(p => p.isImposter);
    const correctVotes = room.players.filter(p => p.vote === imposter.id).length;
    
    // Award points
    room.players.forEach(player => {
      if (player.vote === imposter.id) {
        player.score += 1;
      }
    });

    io.to(roomId).emit('roundEnd', {
      imposter: imposter.id,
      scores: room.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        score: p.score
      }))
    });

    // Clear answers and votes for next round
    room.players.forEach(player => {
      player.answer = null;
      player.vote = null;
      player.isImposter = false;
    });

    if (room.currentRound >= room.maxRounds) {
      io.to(roomId).emit('gameEnd', {
        winner: room.players.reduce((prev, current) => 
          (prev.score > current.score) ? prev : current
        )
      });
    } else {
      startRound(roomId);
    }
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 