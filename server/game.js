const fs = require('fs');
const path = require('path');

const keywordsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'keywords.json'), 'utf8'));
const allKeywords = keywordsData.it;

function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function generateSecretCode() {
    const numbers = [1, 2, 3, 4];
    const shuffledNumbers = shuffle(numbers);
    return shuffledNumbers.slice(0, 3);
}

function startGame(room) {
    const whiteTeam = room.players.filter(p => p.team === 'white');
    const blackTeam = room.players.filter(p => p.team === 'black');

    if (whiteTeam.length < 1 || blackTeam.length < 1) return { error: 'Entrambe le squadre devono avere almeno un giocatore.' };
    if (room.players.length < 3) return { error: 'Sono necessari almeno 3 giocatori per iniziare.' };

    const shuffledKeywords = shuffle(allKeywords);

    const gameState = {
        currentRound: 1,
        currentTeam: 'white',
        phase: 'clue-giving',
        teams: {
            white: { keywords: shuffledKeywords.slice(0, 4), score: { interceptions: 0, mistakes: 0 }, currentCode: generateSecretCode() },
            black: { keywords: shuffledKeywords.slice(4, 8), score: { interceptions: 0, mistakes: 0 }, currentCode: null }
        },
        history: [],
        communicators: {
            white: whiteTeam[0].id,
            black: blackTeam[0].id,
        },
        communicatorRotation: {
            white: whiteTeam.map(p => p.id),
            black: blackTeam.map(p => p.id),
        },
        currentClues: [],
        turnResult: null,
    };
    return { gameState };
}

function handleClueSubmission(gameState, playerId, clues) {
    const { currentTeam, communicators } = gameState;
    if (playerId !== communicators[currentTeam]) return { error: 'Non sei il comunicatore.' };
    if (gameState.phase !== 'clue-giving') return { error: 'Non è la fase di dare gli indizi.' };

    const newGameState = JSON.parse(JSON.stringify(gameState));
    newGameState.phase = 'guessing';
    newGameState.currentClues = clues;
    return { gameState: newGameState };
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
}

function advanceTurn(gameState) {
    const nextTeam = gameState.currentTeam === 'white' ? 'black' : 'white';
    if (nextTeam === 'white') {
        gameState.currentRound++;
    }

    // Rotate communicator
    const teamPlayerIds = gameState.communicatorRotation[nextTeam];
    const currentCommIndex = teamPlayerIds.indexOf(gameState.communicators[nextTeam]);
    gameState.communicators[nextTeam] = teamPlayerIds[(currentCommIndex + 1) % teamPlayerIds.length];

    gameState.currentTeam = nextTeam;
    gameState.phase = 'clue-giving';
    gameState.teams[nextTeam].currentCode = generateSecretCode();
    gameState.currentClues = [];
    gameState.turnResult = null;
    return gameState;
}


function handleGuess(gameState, player, guess, isInterception) {
    const { currentTeam, phase } = gameState;
    const opponentTeam = currentTeam === 'white' ? 'black' : 'white';
    const correctCode = gameState.teams[currentTeam].currentCode;

    if (phase !== 'guessing') return { error: 'Non è la fase per indovinare.' };

    let newGameState = JSON.parse(JSON.stringify(gameState));

    if (isInterception) {
        if (player.team !== opponentTeam) return { error: 'Non puoi intercettare per la tua stessa squadra.' };
        if (arraysEqual(guess, correctCode)) {
            newGameState.teams[opponentTeam].score.interceptions++;
            newGameState.turnResult = { type: 'interception_success', team: opponentTeam };
        } else {
             newGameState.turnResult = { type: 'interception_fail', team: opponentTeam };
        }
    } else {
        if (player.team !== currentTeam) return { error: 'Non è il turno della tua squadra.' };
        if (arraysEqual(guess, correctCode)) {
             newGameState.turnResult = { type: 'guess_success', team: currentTeam };
        } else {
            newGameState.teams[currentTeam].score.mistakes++;
             newGameState.turnResult = { type: 'guess_fail', team: currentTeam };
        }
    }

    // Controlla condizioni di vittoria
    if (newGameState.teams.white.score.interceptions >= 2) newGameState.winner = 'white';
    if (newGameState.teams.black.score.interceptions >= 2) newGameState.winner = 'black';
    if (newGameState.teams.white.score.mistakes >= 2) newGameState.winner = 'black';
    if (newGameState.teams.black.score.mistakes >= 2) newGameState.winner = 'white';

    if (newGameState.winner) {
        newGameState.phase = 'finished';
    } else {
       // Per ora, avanziamo il turno subito dopo il primo tentativo.
       // Una logica più complessa attenderebbe entrambi i tentativi.
       newGameState = advanceTurn(newGameState);
    }

    return { gameState: newGameState };
}

module.exports = {
    startGame,
    handleClueSubmission,
    handleGuess,
};
