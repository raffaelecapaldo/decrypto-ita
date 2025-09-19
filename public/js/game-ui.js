document.addEventListener('DOMContentLoaded', () => {
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
    const turnStatusArea = document.getElementById('turn-status-area');
    const turnStatusMessage = document.getElementById('turn-status-message');
    const turnPhaseMessage = document.getElementById('turn-phase-message');
    const gameLogArea = document.getElementById('game-log-area');
    const gameLogList = document.getElementById('game-log-list');
    const historyArea = document.getElementById('history-area');
    const gameHistory = document.getElementById('game-history');

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
        // Validazione per numeri non ripetuti
        const uniqueGuess = new Set(guess);
        if (uniqueGuess.size !== 3) {
            alert('I numeri non devono essere ripetuti.');
            return;
        }
        window.socket.submitAttempt(guess);
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
        // Validazione per numeri non ripetuti
        const uniqueGuess = new Set(guess);
        if (uniqueGuess.size !== 3) {
            alert('I numeri non devono essere ripetuti.');
            return;
        }
        window.socket.submitAttempt(guess);
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

    function updateGameLog(gameState, players) {
        const { turnResult } = gameState;
        if (!turnResult) {
            gameLogArea.style.display = 'none';
            return;
        }

        gameLogArea.style.display = 'block';
        const li = document.createElement('li');
        const teamName = turnResult.team === 'white' ? 'Bianca' : 'Nera';

        switch (turnResult.type) {
            case 'clue_submission':
                li.innerHTML = `<strong>${turnResult.player}</strong> (Squadra ${teamName}) ha dato gli indizi.`;
                break;
            case 'interception_success':
                li.innerHTML = `<strong>${turnResult.player}</strong> (Squadra ${teamName}) ha intercettato con successo il codice! (+1 punto intercettazione)`;
                break;
            case 'interception_fail':
                li.innerHTML = `<strong>${turnResult.player}</strong> (Squadra ${teamName}) ha provato a intercettare ma ha sbagliato.`;
                break;
            case 'decipher_success':
                li.innerHTML = `<strong>${turnResult.player}</strong> (Squadra ${teamName}) ha decifrato correttamente il codice!`;
                break;
            case 'decipher_fail':
                li.innerHTML = `<strong>${turnResult.player}</strong> (Squadra ${teamName}) ha sbagliato a decifrare. Il codice era ${turnResult.correctCode.join('-')}. (+1 punto errore)`;
                break;
        }
        // Aggiungi il nuovo log in cima alla lista
        if (gameLogList.firstChild) {
            gameLogList.insertBefore(li, gameLogList.firstChild);
        } else {
            gameLogList.appendChild(li);
        }
    }

    function renderGameState(gameState, players, ownSocketId) {
        const currentPlayer = players.find(p => p.socketId === ownSocketId);
        if (!currentPlayer) return;

        const playerTeam = currentPlayer.team;
        const isMyTurn = gameState.currentTeam === playerTeam;
        const opponentTeam = playerTeam === 'white' ? 'black' : 'white';
        const isCommunicator = gameState.communicators[playerTeam] === currentPlayer.id;

        const whiteCommPlayer = players.find(p => p.id === gameState.communicators.white);
        const blackCommPlayer = players.find(p => p.id === gameState.communicators.black);

        // Aggiornamenti generali
        roundNumber.textContent = gameState.currentRound;
        currentTeamDisplay.textContent = gameState.currentTeam === 'white' ? 'Bianca' : 'Nera';
        whiteInterceptions.textContent = gameState.teams.white.score.interceptions;
        whiteMistakes.textContent = gameState.teams.white.score.mistakes;
        blackInterceptions.textContent = gameState.teams.black.score.interceptions;
        blackMistakes.textContent = gameState.teams.black.score.mistakes;
        document.getElementById('white-communicator-name').textContent = whiteCommPlayer ? `${whiteCommPlayer.name}` : 'N/A';
        document.getElementById('black-communicator-name').textContent = blackCommPlayer ? `${blackCommPlayer.name}` : 'N/A';

        // Mostra parole chiave
        whiteTeamPanel.style.display = playerTeam === 'white' ? 'block' : 'none';
        blackTeamPanel.style.display = playerTeam === 'black' ? 'block' : 'none';
        if (playerTeam === 'white') whiteKeywordsList.innerHTML = gameState.teams.white.keywords.map((kw, i) => `<li>${i + 1}. ${kw}</li>`).join('');
        if (playerTeam === 'black') blackKeywordsList.innerHTML = gameState.teams.black.keywords.map((kw, i) => `<li>${i + 1}. ${kw}</li>`).join('');

        // Nascondi tutte le aree di azione
        communicatorArea.style.display = 'none';
        guesserArea.style.display = 'none';
        interceptionArea.style.display = 'none';
        cluesDisplayArea.style.display = 'none';
        turnStatusArea.style.display = 'none';
        document.getElementById('game-over-area').style.display = 'none';

        updateGameLog(gameState, players);
        renderHistory(gameState.history);

        const currentCommunicator = players.find(p => p.id === gameState.communicators[gameState.currentTeam]);

        // Logica per fase e ruolo
        if (gameState.phase === 'finished') {
            const gameOverArea = document.getElementById('game-over-area');
            const winnerDisplay = document.getElementById('winner-display');
            winnerDisplay.textContent = gameState.winner === 'white' ? 'Bianca' : 'Nera';
            gameOverArea.style.display = 'block';
            return;
        }

        turnStatusArea.style.display = 'block';
        turnStatusMessage.textContent = `Turno della squadra ${gameState.currentTeam === 'white' ? 'Bianca' : 'Nera'}. Comunicatore: ${currentCommunicator.name}.`;

        if (gameState.phase === 'clue-giving') {
            turnPhaseMessage.textContent = "Fase: il comunicatore sta preparando gli indizi.";
            if (isMyTurn && isCommunicator) {
                communicatorArea.style.display = 'block';
                secretCodeDisplay.textContent = gameState.teams[playerTeam].currentCode.join(' - ');
            }
        } else {
            cluesDisplayArea.style.display = 'block';
            cluesList.innerHTML = gameState.currentClues.map(c => `<li>${c}</li>`).join('');

            if (gameState.phase === 'interception') {
                const attemptedPlayer = players.find(p => p.id === gameState.attemptedPlayers.interception);
                if (attemptedPlayer) {
                    turnPhaseMessage.textContent = `Fase: Intercettazione. ${attemptedPlayer.name} ha già tentato. In attesa della squadra di turno.`;
                } else {
                    turnPhaseMessage.textContent = `Fase: Intercettazione. La squadra ${opponentTeam} può provare a intercettare.`;
                    if (!isMyTurn) { // Sei nella squadra che deve intercettare
                        interceptionArea.style.display = 'block';
                    }
                }
            } else if (gameState.phase === 'deciphering') {
                 const attemptedPlayer = players.find(p => p.id === gameState.attemptedPlayers.decipher);
                if (attemptedPlayer) {
                    turnPhaseMessage.textContent = `Fase: Decifrazione. ${attemptedPlayer.name} ha già tentato. Il turno sta per finire.`;
                } else {
                    turnPhaseMessage.textContent = `Fase: Decifrazione. La squadra ${gameState.currentTeam} deve indovinare il codice.`;
                     if (isMyTurn && !isCommunicator) {
                        guesserArea.style.display = 'block';
                    }
                }
            }
        }
    }

    function renderHistory(history) {
        gameHistory.innerHTML = '';
        historyArea.style.display = 'block';

        if (!history || history.length === 0) {
            gameHistory.innerHTML = '<p>Lo storico è ancora vuoto.</p>';
            return;
        }

        history.slice().reverse().forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('history-entry');

            const { round, team, clues, interceptionResult, decipherResult } = entry;

            let interceptionHtml = '';
            if (interceptionResult) {
                const teamName = interceptionResult.team === 'white' ? 'Bianca' : 'Nera';
                const outcome = interceptionResult.type === 'interception_success' ? 'success' : 'fail';
                const text = outcome === 'success'
                    ? `<strong>${interceptionResult.player}</strong> (Squadra ${teamName}) ha intercettato con <strong>${interceptionResult.guess.join('-')}</strong>.`
                    : `<strong>${interceptionResult.player}</strong> (Squadra ${teamName}) non ha intercettato con <strong>${interceptionResult.guess.join('-')}</strong>.`;
                interceptionHtml = `
                    <div class="outcome-block interception-attempt ${outcome}">
                        <p>Tentativo di Intercettazione</p>
                        <p>${text}</p>
                    </div>`;
            }

            let decipherHtml = '';
            if (decipherResult) {
                const teamName = decipherResult.team === 'white' ? 'Bianca' : 'Nera';
                const outcome = decipherResult.type === 'decipher_success' ? 'success' : 'fail';
                let text = '';
                if (outcome === 'success') {
                    text = `<strong>${decipherResult.player}</strong> (Squadra ${teamName}) ha decifrato con <strong>${decipherResult.guess.join('-')}</strong>.`;
                } else {
                    text = `<strong>${decipherResult.player}</strong> (Squadra ${teamName}) non ha decifrato. Il codice era <strong>${decipherResult.correctCode.join('-')}</strong>.`;
                }
                decipherHtml = `
                    <div class="outcome-block decipher-attempt ${outcome}">
                        <p>Tentativo di Decifrazione</p>
                        <p>${text}</p>
                    </div>`;
            } else if (interceptionResult && interceptionResult.type === 'interception_success') {
                 decipherHtml = `
                    <div class="outcome-block decipher-attempt">
                        <p>Tentativo di Decifrazione non effettuato.</p>
                    </div>`;
            }


            entryDiv.innerHTML = `
                <div class="history-entry-header">
                    <strong>Round ${round}</strong>
                    <span class="team-name team-${team}">Turno Squadra ${team === 'white' ? 'Bianca' : 'Nera'}</span>
                </div>
                <p class="history-clues">Indizi: ${clues.join(', ')}</p>
                <div class="history-outcome">
                    ${interceptionHtml}
                    ${decipherHtml}
                </div>
            `;
            gameHistory.appendChild(entryDiv);
        });
    }

    window.ui = { updateLobby, renderGameState };
});
