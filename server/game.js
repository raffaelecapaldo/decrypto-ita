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
        phase: 'clue-giving', // Fasi: clue-giving, interception, deciphering, finished
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
        turnHistory: null,
        attemptedPlayers: {
            interception: null, // ID del giocatore che ha tentato di intercettare
            decipher: null, // ID del giocatore che ha tentato di decifrare
        }
    };
    return { gameState };
}

function handleClueSubmission(gameState, player, clues) {
    const { currentTeam, communicators } = gameState;
    if (player.id !== communicators[currentTeam]) return { error: 'Non sei il comunicatore.' };
    if (gameState.phase !== 'clue-giving') return { error: 'Non è la fase di dare gli indizi.' };

    const newGameState = JSON.parse(JSON.stringify(gameState));
    newGameState.phase = 'interception'; // La prima fase dopo gli indizi è l'intercettazione
    newGameState.currentClues = clues;
    newGameState.turnResult = { type: 'clue_submission', player: player.name, team: currentTeam };
    return { gameState: newGameState };
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
}

function advanceTurn(gameState) {
    // Salva la cronologia del turno prima di avanzare
    if (gameState.turnHistory) {
        gameState.history.push({
            round: gameState.currentRound,
            team: gameState.currentTeam,
            clues: gameState.currentClues,
            ...gameState.turnHistory // Aggiunge interceptionResult e decipherResult
        });
    }


    const nextTeam = gameState.currentTeam === 'white' ? 'black' : 'white';
    if (nextTeam === 'white') {
        gameState.currentRound++;
    }

    // Rotate communicator for the next team
    const teamPlayerIds = gameState.communicatorRotation[nextTeam];
    const currentCommIndex = teamPlayerIds.indexOf(gameState.communicators[nextTeam]);
    const nextCommIndex = (currentCommIndex + 1) % teamPlayerIds.length;
    gameState.communicators[nextTeam] = teamPlayerIds[nextCommIndex];

    gameState.currentTeam = nextTeam;
    gameState.phase = 'clue-giving';
    gameState.teams[nextTeam].currentCode = generateSecretCode();
    gameState.currentClues = [];
    gameState.turnResult = null;
    gameState.attemptedPlayers = { interception: null, decipher: null }; // Resetta i tentativi
    gameState.turnHistory = null;
    return gameState;
}


function handleGuess(gameState, player, guess) {
    const { currentTeam, phase, attemptedPlayers, teams } = gameState;
    const opponentTeam = currentTeam === 'white' ? 'black' : 'white';
    const correctCode = teams[currentTeam].currentCode;

    let newGameState = JSON.parse(JSON.stringify(gameState));

    if (!newGameState.turnHistory) {
        newGameState.turnHistory = { interceptionResult: null, decipherResult: null };
    }

    if (phase === 'interception') {
        if (player.team !== opponentTeam) return { error: 'Non puoi intercettare in questo momento.' };
        if (attemptedPlayers.interception) return { error: 'Qualcuno della tua squadra ha già provato a intercettare.' };

        newGameState.attemptedPlayers.interception = player.id;
        const isCorrect = arraysEqual(guess, correctCode);
        const result = {
            type: isCorrect ? 'interception_success' : 'interception_fail',
            player: player.name,
            team: opponentTeam,
            guess
        };
        newGameState.turnHistory.interceptionResult = result;

        if (isCorrect) {
            newGameState.teams[opponentTeam].score.interceptions++;
            newGameState = advanceTurn(newGameState); // Il turno finisce
        } else {
            newGameState.phase = 'deciphering'; // Si passa alla fase di decifrazione
        }
         newGameState.turnResult = result;

    } else if (phase === 'deciphering') {
        if (player.team !== currentTeam) return { error: 'Non è il turno della tua squadra per decifrare.' };
        if (attemptedPlayers.decipher) return { error: 'Qualcuno della tua squadra ha già provato a decifrare.' };
        if (player.id === newGameState.communicators[currentTeam]) return { error: 'Il comunicatore non può decifrare.' };

        newGameState.attemptedPlayers.decipher = player.id;
        const isCorrect = arraysEqual(guess, correctCode);

        const result = {
            type: isCorrect ? 'decipher_success' : 'decipher_fail',
            player: player.name,
            team: currentTeam,
            guess,
            ...( !isCorrect && { correctCode })
        };
        newGameState.turnHistory.decipherResult = result;


        if (!isCorrect) {
            newGameState.teams[currentTeam].score.mistakes++;
        }
        newGameState.turnResult = result;
        newGameState = advanceTurn(newGameState); // Il turno finisce comunque

    } else {
        return { error: `Non è la fase giusta per indovinare (${phase}).` };
    }

    // Controlla condizioni di vittoria
    if (newGameState.teams.white.score.interceptions >= 2) newGameState.winner = 'white';
    if (newGameState.teams.black.score.interceptions >= 2) newGameState.winner = 'black';
    if (newGameState.teams.white.score.mistakes >= 2) newGameState.winner = 'black';
    if (newGameState.teams.black.score.mistakes >= 2) newGameState.winner = 'white';

    if (newGameState.winner) {
        newGameState.phase = 'finished';
    }

    return { gameState: newGameState };
}

module.exports = {
    startGame,
    handleClueSubmission,
    handleGuess,
};
