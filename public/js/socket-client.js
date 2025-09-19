(function() {
    const socket = io();
    let currentRoomCode = null;

    // --- Emetti eventi al server ---

    function createRoom(nickname) {
        socket.emit('createRoom', { nickname });
    }

    function joinRoom(nickname, roomCode) {
        socket.emit('joinRoom', { nickname, roomCode });
    }

    function joinTeam(team) {
        if (!currentRoomCode) return;
        socket.emit('joinTeam', { roomCode: currentRoomCode, team });
    }

    function startGame() {
        if (!currentRoomCode) return;
        socket.emit('startGame', { roomCode: currentRoomCode });
    }

    function submitClues(clues) {
        if (!currentRoomCode) return;
        socket.emit('submitClues', { roomCode: currentRoomCode, clues });
    }

    function submitAttempt(guess) {
        if (!currentRoomCode) return;
        socket.emit('submitAttempt', { roomCode: currentRoomCode, guess });
    }

    // --- Gestisci eventi dal server ---

    socket.on('connect', () => {
        console.log('Connesso al server con ID:', socket.id);
    });

    socket.on('roomCreated', ({ roomCode }) => {
        console.log(`Stanza creata con codice: ${roomCode}`);
        currentRoomCode = roomCode;
        document.getElementById('room-code-display').textContent = roomCode;
        window.app.showSection('lobby');
    });

    socket.on('joinSuccess', ({ roomCode }) => {
        console.log(`Unito alla stanza con codice: ${roomCode}`);
        currentRoomCode = roomCode;
        document.getElementById('room-code-display').textContent = roomCode;
        window.app.showSection('lobby');
    });

    socket.on('updateLobby', (players) => {
        console.log('Aggiornamento lobby:', players);
        window.ui.updateLobby(players);
    });

    socket.on('gameStarted', ({ gameState, players }) => {
        console.log('La partita è iniziata!');
        window.app.showSection('game');
        window.ui.renderGameState(gameState, players, socket.id);
    });

    socket.on('gameStateUpdate', ({ gameState, players }) => {
        console.log('Ricevuto aggiornamento dello stato di gioco.');
        window.ui.renderGameState(gameState, players, socket.id);
    });

    socket.on('error', (message) => {
        console.error('Errore dal server:', message);
        window.app.showError(message);
    });

    socket.on('disconnect', () => {
        console.log('Disconnesso dal server');
        window.app.showError('Disconnesso dal server. Prova a ricaricare la pagina.');
        window.app.showSection('home');
        currentRoomCode = null;
    });

    // Esponi le funzioni per chiamarle da altri moduli
    window.socket = {
        createRoom,
        joinRoom,
        joinTeam,
        startGame,
        submitClues,
        submitAttempt,
        getId: () => socket.id,
    };
})();
