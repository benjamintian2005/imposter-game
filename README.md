# Imposter Game

A multiplayer web game where players try to identify the imposter in each round. Players join a room, answer questions, and vote for who they think is the imposter.

## Features

- Real-time multiplayer gameplay
- Room-based game sessions
- Multiple rounds with different questions
- Voting system
- Score tracking
- Modern and responsive UI

## Setup

1. Install dependencies:
```bash
npm install
cd client
npm install
```

2. Start the development servers:
```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
npm run dev     # Backend
npm run client  # Frontend
```

## Game Rules

1. Players join a room with a unique code
2. Each round, players are asked a question
3. One player (the imposter) receives a different question
4. Players have a limited time to submit their answers
5. After time expires, all answers are revealed
6. Players vote for who they think is the imposter
7. Points are awarded for correctly identifying the imposter
8. The game continues for a set number of rounds
9. The player with the most points at the end wins 