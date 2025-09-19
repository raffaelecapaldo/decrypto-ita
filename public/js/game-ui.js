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
    const playerUsername = document.getElementById('player-username');
    const whiteTeamMembers = document.getElementById('white-team-members');
    const blackTeamMembers = document.getElementById('black-team-members');
    const whiteKeywordsList = document.getElementById('white-keywords');
    const blackKeywordsList = document.getElementById('black-keywords');
    const whiteTeamPanel = document.getElementById('white-team-panel');
    const blackTeamPanel = document.getElementById('black-team-panel');

    // Aree di Azione
    const communicatorArea = document.getElementById('communicator-area');
    const guesserArea = document.getElementById('guesser-area');
    const interceptionArea = document.getElementById('interception-area');
    const cluesDisplayArea = document.getElementById('clues-display-area');
    const cluesTitle = document.getElementById('clues-title');
    const cluesList = document.getElementById('clues-list');
    const turnStatusArea = document.getElementById('turn-status-area');
    const turnStatusMessage = document.getElementById('turn-status-message');
    const turnPhaseMessage = document.getElementById('turn-phase-message');
    const gameLogArea = document.getElementById('game-log-area');
    const gameLogList = document.getElementById('game-log-list');
    const historyArea = document.getElementById('history-area');
    const gameHistory = document.getElementById('game-history');

    const secretCodeDisplay = document.getElementById('secret-code-display');
    const cluesError = document.getElementById('clues-error');
    const guessError = document.getElementById('guess-error');
    const interceptionError = document.getElementById('interception-error');

    // Elementi del Modal
    const tablesModal = document.getElementById('tables-modal');
    const openTablesModalBtn = document.getElementById('open-tables-modal-btn');
    const closeTablesModalBtn = document.getElementById('close-tables-modal-btn');

    openTablesModalBtn.addEventListener('click', () => {
        tablesModal.style.display = 'block';
    });

    closeTablesModalBtn.addEventListener('click', () => {
        tablesModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === tablesModal) {
            tablesModal.style.display = 'none';
        }
    });

    function showTemporaryError(element, message) {
        element.textContent = message;
        setTimeout(() => {
            element.textContent = '';
        }, 3000);
    }

    const submitCluesBtn = document.getElementById('submit-clues-btn');
    const clueInputs = [
        document.getElementById('clue-1'),
        document.getElementById('clue-2'),
        document.getElementById('clue-3'),
    ];

    submitCluesBtn.addEventListener('click', () => {
        const clues = clueInputs.map(input => input.value.trim());
        if (clues.some(clue => !clue)) {
            showTemporaryError(cluesError, 'Per favore, inserisci tutti e tre gli indizi.');
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
            showTemporaryError(guessError, 'Inserisci 3 numeri validi.');
            return;
        }
        const uniqueGuess = new Set(guess);
        if (uniqueGuess.size !== 3) {
            showTemporaryError(guessError, 'I numeri non devono essere ripetuti.');
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
            showTemporaryError(interceptionError, 'Inserisci 3 numeri validi per intercettare.');
            return;
        }
        const uniqueGuess = new Set(guess);
        if (uniqueGuess.size !== 3) {
            showTemporaryError(interceptionError, 'I numeri non devono essere ripetuti.');
            return;
        }
        window.socket.submitAttempt(guess);
        interceptionInputs.forEach(input => input.value = '');
    });

    function updateLobby({ players, creatorId }) {
        whiteTeamList.innerHTML = '';
        blackTeamList.innerHTML = '';
        const ownSocketId = window.socket.getId();
        const startGameBtn = document.getElementById('start-game-btn');

        if (ownSocketId === creatorId) {
            startGameBtn.style.display = 'block';
        } else {
            startGameBtn.style.display = 'none';
        }

        players.forEach(p => {
            const li = document.createElement('li');
            let text = p.name;
            if (p.socketId === ownSocketId) {
                text += ' (Tu)';
            }
            li.textContent = text;
            if (p.team === 'white') whiteTeamList.appendChild(li);
            else if (p.team === 'black') blackTeamList.appendChild(li);
        });
    }

    function updateTables(gameState, playerTeam) {
        const modalBody = document.getElementById('modal-tables-body');
        modalBody.innerHTML = ''; // Clear previous content

        const opponentTeam = playerTeam === 'white' ? 'black' : 'white';
        const teamsToRender = [
            { name: playerTeam, title: `Squadra ${playerTeam === 'white' ? 'Bianca' : 'Nera'} (La tua)` },
            { name: opponentTeam, title: `Squadra ${opponentTeam === 'white' ? 'Bianca' : 'Nera'}` }
        ];

        function generateClueTable(clues, guess, correctCode) {
            let table = '<table class="clue-detail-table">';
            table += '<thead><tr><th>Indizio</th><th>Tentativo</th><th>Reale</th></tr></thead>';
            table += '<tbody>';
            for (let i = 0; i < 3; i++) {
                const clue = clues[i] || '';
                const guessedNum = guess ? guess[i] : '-';
                const actualNum = correctCode ? correctCode[i] : '-';
                table += `<tr><td>${clue}</td><td>${guessedNum}</td><td>${actualNum}</td></tr>`;
            }
            table += '</tbody></table>';
            return table;
        }

        teamsToRender.forEach(teamInfo => {
            const team = teamInfo.name;
            const wrapper = document.createElement('div');
            wrapper.className = 'team-table-wrapper';

            let tableStructure = `<h3>${teamInfo.title}</h3>`;

            // Main table for rounds 1-8
            tableStructure += '<div class="modal-table">';
            for (let i = 1; i <= 8; i++) {
                tableStructure += `
                    <div class="round-container" id="round-${team}-${i}">
                        <div class="round-header">
                            <span class="round-number"># ${i.toString().padStart(2, '0')}</span>
                        </div>
                        <div class="round-clues" id="clues-${team}-${i}"></div>
                    </div>
                `;
            }
            tableStructure += '</div>';

            // Clue summary section
            tableStructure += '<div class="clue-summary-container">';
            for (let i = 1; i <= 4; i++) {
                tableStructure += `
                    <div class="clue-summary-column">
                        <div class="clue-summary-title"># 0${i}</div>
                        <ul class="clue-summary-list" id="summary-${team}-${i}"></ul>
                    </div>
                `;
            }
            tableStructure += '</div>';

            wrapper.innerHTML = tableStructure;
            modalBody.appendChild(wrapper);
        });

        // Populate tables with history data
        gameState.history.forEach(entry => {
            const round = entry.round;
            const team = entry.team;
            const opponent = team === 'white' ? 'black' : 'white';

            // Determine correct code
            let correctCode = null;
            if (entry.decipherResult) {
                correctCode = entry.decipherResult.type === 'decipher_success'
                    ? entry.decipherResult.guess
                    : entry.decipherResult.correctCode;
            }

            // Populate clue tables
            const clues = entry.clues;
            const teamGuess = entry.decipherResult ? entry.decipherResult.guess : null;
            const opponentGuess = entry.interceptionResult ? entry.interceptionResult.guess : null;

            const teamCluesContainer = document.getElementById(`clues-${team}-${round}`);
            if (teamCluesContainer) {
                teamCluesContainer.innerHTML = generateClueTable(clues, teamGuess, correctCode);
            }

            const opponentCluesContainer = document.getElementById(`clues-${opponent}-${round}`);
            if (opponentCluesContainer) {
                opponentCluesContainer.innerHTML = generateClueTable(clues, opponentGuess, correctCode);
            }

            if (correctCode) {
                // Populate summary lists
                correctCode.forEach((code, index) => {
                    const summaryList = document.getElementById(`summary-${team}-${code}`);
                    if (summaryList) {
                        const li = document.createElement('li');
                        li.textContent = clues[index];
                        summaryList.appendChild(li);
                    }
                });
            }
        });
    }

    function renderGameState(gameState, players, ownSocketId) {
        const currentPlayer = players.find(p => p.socketId === ownSocketId);
        if (!currentPlayer) return;

        const playerTeam = currentPlayer.team;
        updateTables(gameState, playerTeam);

        const isMyTurn = gameState.currentTeam === playerTeam;
        const opponentTeam = playerTeam === 'white' ? 'black' : 'white';
        const isCommunicator = gameState.communicators[playerTeam] === currentPlayer.id;

        // Aggiornamenti generali
        roundNumber.textContent = gameState.currentRound;
        currentTeamDisplay.textContent = gameState.currentTeam === 'white' ? 'Bianca' : 'Nera';
        whiteInterceptions.textContent = gameState.teams.white.score.interceptions;
        whiteMistakes.textContent = gameState.teams.white.score.mistakes;
        blackInterceptions.textContent = gameState.teams.black.score.interceptions;
        blackMistakes.textContent = gameState.teams.black.score.mistakes;
        playerUsername.textContent = currentPlayer.name;

        // Aggiorna membri squadre
        whiteTeamMembers.innerHTML = '';
        blackTeamMembers.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.name;
            if (p.id === gameState.communicators[p.team]) {
                li.classList.add('communicator');
            }
            if (p.team === 'white') {
                whiteTeamMembers.appendChild(li);
            } else if (p.team === 'black') {
                blackTeamMembers.appendChild(li);
            }
        });

        // Mostra parole chiave
        whiteTeamPanel.style.display = playerTeam === 'white' ? 'block' : 'none';
        blackTeamPanel.style.display = playerTeam === 'black' ? 'block' : 'none';

        const renderKeywords = (keywords) => {
            return keywords.map((kw, i) => `
                <li>
                    <span class="keyword-number">${i + 1}</span>
                    <span class="keyword-text">${kw}</span>
                </li>
            `).join('');
        };

        if (playerTeam === 'white') {
            whiteKeywordsList.innerHTML = renderKeywords(gameState.teams.white.keywords);
        }
        if (playerTeam === 'black') {
            blackKeywordsList.innerHTML = renderKeywords(gameState.teams.black.keywords);
        }

        // Nascondi tutte le aree di azione
        communicatorArea.style.display = 'none';
        guesserArea.style.display = 'none';
        interceptionArea.style.display = 'none';
        cluesDisplayArea.style.display = 'none';
        turnStatusArea.style.display = 'none';
        document.getElementById('game-over-area').style.display = 'none';

        if (gameState.currentRound === 1 && !gameState.turnResult) {
            gameLogList.innerHTML = '';
        }

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
            const communicatorName = players.find(p => p.id === gameState.communicators[gameState.currentTeam]).name;
            cluesTitle.textContent = `Indizi di ${communicatorName}:`;
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
