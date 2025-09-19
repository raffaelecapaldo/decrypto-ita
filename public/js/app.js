document.addEventListener('DOMContentLoaded', () => {
    const sections = {
        home: document.getElementById('home-section'),
        lobby: document.getElementById('lobby-section'),
        game: document.getElementById('game-section')
    };

    // Elementi della Home
    const createNicknameInput = document.getElementById('create-nickname');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinNicknameInput = document.getElementById('join-nickname');
    const roomCodeInput = document.getElementById('room-code-input');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const errorMessage = document.getElementById('error-message');

    // Elementi della Lobby
    const joinTeamBtns = document.querySelectorAll('.join-team-btn');
    const startGameBtn = document.getElementById('start-game-btn');


    // Funzione per mostrare una sezione e nascondere le altre
    function showSection(sectionName) {
        Object.keys(sections).forEach(key => {
            sections[key].classList.remove('active');
        });
        if (sections[sectionName]) {
            sections[key].classList.add('active');
        }
        // Pulisci i messaggi di errore quando cambi sezione
        errorMessage.textContent = '';
    }

    // --- Event listeners ---

    createRoomBtn.addEventListener('click', () => {
        const nickname = createNicknameInput.value.trim();
        if (!nickname) {
            errorMessage.textContent = 'Per favore, inserisci un nickname.';
            return;
        }
        window.socket.createRoom(nickname);
    });

    joinRoomBtn.addEventListener('click', () => {
        const nickname = joinNicknameInput.value.trim();
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (!nickname || !roomCode) {
            errorMessage.textContent = 'Per favore, inserisci nickname e codice stanza.';
            return;
        }
        window.socket.joinRoom(nickname, roomCode);
    });

    joinTeamBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const team = btn.dataset.team;
            window.socket.joinTeam(team);
        });
    });

    startGameBtn.addEventListener('click', () => {
        window.socket.startGame();
    });

    // Inizializza mostrando solo la home
    showSection('home');

    // Esponi le funzioni per poterle chiamare da altri moduli
    window.app = {
        showSection,
        showError: (message) => {
            errorMessage.textContent = message;
        }
    };
});
