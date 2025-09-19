const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./server/room.js');
const GameManager = require('./server/game.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Per semplicità durante lo sviluppo
  }
});

const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function filterGameStateForPlayer(fullGameState, players, socketId) {
    const player = players.find(p => p.socketId === socketId);
    if (!player || !fullGameState) return {};

    const filteredState = JSON.parse(JSON.stringify(fullGameState));
    const isWhiteCommunicator = filteredState.communicators.white === player.id;
    const isBlackCommunicator = filteredState.communicators.black === player.id;

    if (!isWhiteCommunicator) {
        if (filteredState.teams.white) filteredState.teams.white.currentCode = null;
    }
    if (!isBlackCommunicator) {
        if (filteredState.teams.black) filteredState.teams.black.currentCode = null;
    }

    return filteredState;
}

function broadcastGameStateUpdate(room) {
    if (!room || !room.gameState) return;
    room.players.forEach(player => {
        const filteredGameState = filterGameStateForPlayer(room.gameState, room.players, player.socketId);
        io.to(player.socketId).emit('gameStateUpdate', { gameState: filteredGameState, players: room.players });
    });
}

io.on('connection', (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);

  socket.on('createRoom', ({ nickname }) => {
    const { roomCode } = RoomManager.createRoom(socket.id, nickname);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
    const room = RoomManager.getRoom(roomCode);
    io.to(roomCode).emit('updateLobby', { players: room.players, creatorId: room.creatorId });
  });

  socket.on('joinRoom', ({ nickname, roomCode }) => {
    const { room, error } = RoomManager.joinRoom(socket.id, nickname, roomCode);
    if (error) {
      socket.emit('error', error);
      return;
    }
    socket.join(roomCode);
    socket.emit('joinSuccess', { roomCode });
    io.to(roomCode).emit('updateLobby', { players: room.players, creatorId: room.creatorId });
  });

  socket.on('joinTeam', ({ roomCode, team }) => {
    const { room, error } = RoomManager.joinTeam(socket.id, roomCode, team);
    if (error) {
        socket.emit('error', error);
        return;
    }
    io.to(roomCode).emit('updateLobby', { players: room.players, creatorId: room.creatorId });
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return socket.emit('error', 'Stanza non trovata.');

    // Solo il creatore della stanza può avviare la partita
    if (room.creatorId !== socket.id) {
        return socket.emit('error', 'Solo il creatore della stanza può avviare la partita.');
    }

    const { gameState, error } = GameManager.startGame(room);
    if (error) return socket.emit('error', error);

    room.status = 'playing';
    room.gameState = gameState;
    room.players.forEach(player => {
        const filteredGameState = filterGameStateForPlayer(room.gameState, room.players, player.socketId);
        io.to(player.socketId).emit('gameStarted', { gameState: filteredGameState, players: room.players });
    });
    console.log(`[Socket.IO] Game started in room ${roomCode}`);
  });

  socket.on('submitClues', ({ roomCode, clues }) => {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !room.gameState) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const { gameState, error } = GameManager.handleClueSubmission(room.gameState, player, clues);
    if (error) {
        socket.emit('error', error);
        return;
    }

    room.gameState = gameState;
    broadcastGameStateUpdate(room);
  });

  socket.on('submitAttempt', ({ roomCode, guess }) => {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !room.gameState) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const { gameState, error } = GameManager.handleGuess(room.gameState, player, guess);
    if (error) return socket.emit('error', error);

    room.gameState = gameState;
    broadcastGameStateUpdate(room);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    const result = RoomManager.leaveRoom(socket.id);
    if (result) {
      const { roomCode, room } = result;
      io.to(roomCode).emit('updateLobby', { players: room.players, creatorId: room.creatorId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
