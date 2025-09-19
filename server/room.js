const { v4: uuidv4 } = require('uuid');

// In-memory storage for rooms
const rooms = {};

/**
 * Generates a random 4-character room code.
 * @returns {string} A unique room code.
 */
function generateRoomCode() {
    let code;
    do {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
    } while (rooms[code]); // Ensure code is unique
    return code;
}

/**
 * Creates a new room and adds the host player.
 * @param {string} socketId - The socket ID of the host.
 * @param {string} nickname - The nickname of the host.
 * @returns {{roomCode: string, player: object}} The created room details.
 */
function createRoom(socketId, nickname) {
    const roomCode = generateRoomCode();
    const player = {
        id: uuidv4(),
        name: nickname,
        socketId: socketId,
        team: null,
        isCommunicator: false,
    };

    rooms[roomCode] = {
        id: roomCode,
        players: [player],
        gameState: null, // Game state will be added later
        createdAt: new Date(),
        status: 'waiting',
        settings: {
            timerEnabled: false,
            clueTimer: 120,
            guessTimer: 60,
        },
    };
    console.log(`[RoomManager] Room ${roomCode} created by ${nickname}.`);
    return { roomCode, player };
}

/**
 * Adds a player to an existing room.
 * @param {string} socketId - The socket ID of the player.
 * @param {string} nickname - The nickname of the player.
 * @param {string} roomCode - The code of the room to join.
 * @returns {{room: object, player: object, error: string|null}}
 */
function joinRoom(socketId, nickname, roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return { error: 'Stanza non trovata.' };
    }
    if (room.status !== 'waiting') {
        return { error: 'La partita è già iniziata o è finita.' };
    }
    if (room.players.length >= 10) { // Limite di giocatori per stanza
        return { error: 'La stanza è piena.' };
    }

    const player = {
        id: uuidv4(),
        name: nickname,
        socketId: socketId,
        team: null,
        isCommunicator: false,
    };

    room.players.push(player);
    console.log(`[RoomManager] ${nickname} joined room ${roomCode}.`);
    return { room, player };
}

/**
 * Removes a player from a room based on their socket ID.
 * @param {string} socketId - The socket ID of the player to remove.
 * @returns {{roomCode: string, remainingPlayers: Array}|null}
 */
function leaveRoom(socketId) {
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        const playerIndex = room.players.findIndex(p => p.socketId === socketId);

        if (playerIndex !== -1) {
            const removedPlayer = room.players.splice(playerIndex, 1)[0];
            console.log(`[RoomManager] ${removedPlayer.name} left room ${roomCode}.`);

            // Se la stanza è vuota, eliminala
            if (room.players.length === 0) {
                delete rooms[roomCode];
                console.log(`[RoomManager] Room ${roomCode} is empty and has been deleted.`);
                return null;
            }
            return { roomCode, room };
        }
    }
    return null;
}

/**
 * Assigns a player to a team.
 * @param {string} socketId - The socket ID of the player.
 * @param {string} roomCode - The room code.
 * @param {'white' | 'black'} team - The team to join.
 * @returns {{room: object, error: string|null}}
 */
function joinTeam(socketId, roomCode, team) {
    const room = rooms[roomCode];
    if (!room) {
        return { error: 'Stanza non trovata.' };
    }

    const player = room.players.find(p => p.socketId === socketId);
    if (!player) {
        return { error: 'Giocatore non trovato.' };
    }

    // Limite di 5 giocatori per squadra
    const teamSize = room.players.filter(p => p.team === team).length;
    if (teamSize >= 5) {
        return { error: 'La squadra è piena.' };
    }

    player.team = team;
    console.log(`[RoomManager] ${player.name} joined team ${team} in room ${roomCode}.`);
    return { room };
}

/**
 * Retrieves a room by its code.
 * @param {string} roomCode
 * @returns {object|undefined}
 */
function getRoom(roomCode) {
    return rooms[roomCode];
}


module.exports = {
    createRoom,
    joinRoom,
    leaveRoom,
    joinTeam,
    getRoom,
};
