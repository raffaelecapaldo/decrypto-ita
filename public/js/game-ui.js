(function() {
    // Elementi della Lobby
    const whiteTeamList = document.getElementById('white-team-list');
    const blackTeamList = document.getElementById('black-team-list');

    // Elementi del Gioco
    const roundNumber = document.getElementById('round-number');
    const currentTeamDisplay = document.getElementById('current-team-display');
    const whiteInterceptions = document.getElementById('white-interceptions');
    const whiteMistakes = document.getElementById('white-mistakes');
    const blackInterceptions = document.getElementById('black-interceptions');
    const blackMistakes = document.getElementById('black-mistakes');
    const whiteKeywordsList = document.getElementById('white-keywords');
    const blackKeywordsList = document.getElementById('black-keywords');
    const whiteTeamPanel = document.getElementById('white-team-panel');
    const blackTeamPanel = document.getElementById('black-team-panel');

    // Aree di Azione
    const communicatorArea = document.getElementById('communicator-area');
    const guesserArea = document.getElementById('guesser-area');
    const interceptionArea = document.getElementById('interception-area');
    const cluesDisplayArea = document.getElementById('clues-display-area');
    const cluesList = document.getElementById('clues-list');

    const secretCodeDisplay = document.getElementById('secret-code-display');
    const submitCluesBtn = document.getElementById('submit-clues-btn');
    const clueInputs = [
        document.getElementById('clue-1'),
        document.getElementById('clue-2'),
        document.getElementById('clue-3'),
    ];

    submitCluesBtn.addEventListener('click', () => {
        const clues = clueInputs.map(input => input.value.trim());
        if (clues.some(clue => !clue)) {
            alert('Per favore, inserisci tutti e tre gli indizi.');
            return;
        }
        window.socket.submitClues(clues);
        clueInputs.forEach(input => input.value = '');
    });

    const submitGuessBtn = document.getElementById('submit-guess-btn');
    const guessInputs = [document.getElementById('guess-1'), document.getElementById('guess-2'), document.getElementById('guess-3')];
    submitGuessBtn.addEventListener('click', () => {
        const guess = guessInputs.map(i => parseInt(i.value, 10));
        if (guess.some(isNaN)) {
            alert('Inserisci 3 numeri validi.');
            return;
        }
        window.socket.submitGuess(guess);
        guessInputs.forEach(input => input.value = '');
    });

    const submitInterceptionBtn = document.getElementById('submit-interception-btn');
    const interceptionInputs = [document.getElementById('intercept-1'), document.getElementById('intercept-2'), document.getElementById('intercept-3')];
    submitInterceptionBtn.addEventListener('click', () => {
        const guess = interceptionInputs.map(i => parseInt(i.value, 10));
        if (guess.some(isNaN)) {
            alert('Inserisci 3 numeri validi per intercettare.');
            return;
        }
        window.socket.submitInterception(guess);
        interceptionInputs.forEach(input => input.value = '');
    });

    function updateLobby(players) {
        whiteTeamList.innerHTML = '';
        blackTeamList.innerHTML = '';
        const ownSocketId = window.socket.getId();

        players.forEach(p => {
            const li = document.createElement('li');
            let text = p.name;
            if (p.socketId === ownSocketId) {
                text += ' (Tu)';
            }
            // Questo non funzionerà qui perché lo stato di comunicatore non è nella lista lobby
            // lo aggiungerò alla UI di gioco
            li.textContent = text;
            if (p.team === 'white') whiteTeamList.appendChild(li);
            else if (p.team === 'black') blackTeamList.appendChild(li);
        });
    }

    function renderGameState(gameState, players, ownSocketId) {
        const currentPlayer = players.find(p => p.socketId === ownSocketId);
        if (!currentPlayer) return;

        const playerTeam = currentPlayer.team;
        const isMyTurn = gameState.currentTeam === playerTeam;
        const myTeamState = gameState.teams[playerTeam];
        const isCommunicator = myTeamState && gameState.communicators[playerTeam] === currentPlayer.id;

        // Trova i nomi dei comunicatori
        const whiteCommPlayer = players.find(p => p.id === gameState.communicators.white);
        const blackCommPlayer = players.find(p => p.id === gameState.communicators.black);
        document.getElementById('white-communicator-name').textContent = whiteCommPlayer ? whiteCommPlayer.name : 'N/A';
        document.getElementById('black-communicator-name').textContent = blackCommPlayer ? blackCommPlayer.name : 'N/A';

        // Aggiornamenti generali
        roundNumber.textContent = gameState.currentRound;
        currentTeamDisplay.textContent = gameState.currentTeam === 'white' ? 'Bianca' : 'Nera';
        whiteInterceptions.textContent = gameState.teams.white.score.interceptions;
        whiteMistakes.textContent = gameState.teams.white.score.mistakes;
        blackInterceptions.textContent = gameState.teams.black.score.interceptions;
        blackMistakes.textContent = gameState.teams.black.score.mistakes;

        // Mostra parole chiave
        if (playerTeam === 'white') {
            whiteTeamPanel.style.display = 'block';
            blackTeamPanel.style.display = 'none';
            whiteKeywordsList.innerHTML = gameState.teams.white.keywords.map((kw, i) => `<li>${i + 1}. ${kw}</li>`).join('');
        } else if (playerTeam === 'black') {
            whiteTeamPanel.style.display = 'none';
            blackTeamPanel.style.display = 'block';
            blackKeywordsList.innerHTML = gameState.teams.black.keywords.map((kw, i) => `<li>${i + 1}. ${kw}</li>`).join('');
        }

        // Nascondi tutte le aree di azione
        communicatorArea.style.display = 'none';
        guesserArea.style.display = 'none';
        interceptionArea.style.display = 'none';
        cluesDisplayArea.style.display = 'none';

        // Logica per fase e ruolo
        if (gameState.phase === 'clue-giving') {
            if (isMyTurn && isCommunicator) {
                communicatorArea.style.display = 'block';
                if (myTeamState.currentCode) {
                    secretCodeDisplay.textContent = myTeamState.currentCode.join(' - ');
                }
            } else {
                // In attesa degli indizi
            }
        } else if (gameState.phase === 'guessing') {
            cluesDisplayArea.style.display = 'block';
            cluesList.innerHTML = gameState.currentClues.map(c => `<li>${c}</li>`).join('');

            if (isMyTurn && !isCommunicator) {
                guesserArea.style.display = 'block';
            } else if (!isMyTurn) {
                interceptionArea.style.display = 'block';
            }
        } else if (gameState.phase === 'finished') {
            const gameOverArea = document.getElementById('game-over-area');
            const winnerDisplay = document.getElementById('winner-display');
            winnerDisplay.textContent = gameState.winner === 'white' ? 'Bianca' : 'Nera';
            gameOverArea.style.display = 'block';
        }
    }

    window.ui = { updateLobby, renderGameState };
})();
