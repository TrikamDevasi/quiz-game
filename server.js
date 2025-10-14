const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Store active rooms
const rooms = new Map();

// Quiz questions database
const quizQuestions = require('./questions.json');

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

function handleMessage(ws, data) {
    switch (data.type) {
        case 'create_room':
            createRoom(ws, data);
            break;
        case 'play_with_bot':
            playWithBot(ws, data);
            break;
        case 'join_room':
            joinRoom(ws, data);
            break;
        case 'start_quiz':
            startQuiz(ws, data);
            break;
        case 'submit_answer':
            submitAnswer(ws, data);
            break;
        case 'use_lifeline':
            useLifeline(ws, data);
            break;
    }
}

function createRoom(ws, data) {
    const roomId = generateRoomId();
    const room = {
        id: roomId,
        host: ws,
        players: [{ ws, name: data.playerName, score: 0, answered: false }],
        settings: null,
        currentQuestion: 0,
        questions: [],
        startTime: null,
        lifelines: {},
        botDifficulty: null
    };
    
    rooms.set(roomId, room);
    ws.roomId = roomId;
    
    ws.send(JSON.stringify({
        type: 'room_created',
        roomId: roomId
    }));
}

function playWithBot(ws, data) {
    const roomId = generateRoomId();
    const room = {
        id: roomId,
        host: ws,
        players: [
            { ws, name: data.playerName, score: 0, answered: false },
            { ws: null, name: '🤖 Bot', score: 0, answered: false, isBot: true }
        ],
        settings: data.settings || {},
        currentQuestion: 0,
        questions: [],
        startTime: null,
        lifelines: {},
        botDifficulty: data.botDifficulty || 'medium'
    };
    
    rooms.set(roomId, room);
    ws.roomId = roomId;
    
    // Auto-start quiz with bot
    ws.send(JSON.stringify({
        type: 'player_joined',
        players: room.players.map(p => ({ name: p.name }))
    }));
    
    // Start quiz immediately
    setTimeout(() => {
        startQuiz(ws, data.settings || {});
    }, 1000);
}

function joinRoom(ws, data) {
    const room = rooms.get(data.roomId);
    
    if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
    }
    
    if (room.players.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
    }
    
    room.players.push({ ws, name: data.playerName, score: 0, answered: false });
    ws.roomId = data.roomId;
    
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'player_joined',
            players: room.players.map(p => ({ name: p.name, score: p.score }))
        }));
    });
}

function startQuiz(ws, data) {
    const room = rooms.get(ws.roomId);
    if (!room || room.host !== ws) return;
    
    room.settings = data.settings;
    
    const categoryQuestions = quizQuestions[data.settings.category] || [];
    const shuffled = [...categoryQuestions].sort(() => 0.5 - Math.random());
    room.questions = shuffled.slice(0, data.settings.questionCount);
    room.currentQuestion = 0;
    
    room.players.forEach(player => {
        player.lifelines = {
            fiftyFifty: true,
            audiencePoll: true,
            skipQuestion: true
        };
    });
    
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'quiz_started',
            settings: room.settings,
            totalQuestions: room.questions.length
        }));
    });
    
    setTimeout(() => sendQuestion(room), 1000);
}

function sendQuestion(room) {
    if (room.currentQuestion >= room.questions.length) {
        endQuiz(room);
        return;
    }
    
    const question = room.questions[room.currentQuestion];
    room.startTime = Date.now();
    
    room.players.forEach(player => {
        player.answered = false;
        if (player.ws) {
            player.ws.send(JSON.stringify({
                type: 'new_question',
                questionNumber: room.currentQuestion + 1,
                totalQuestions: room.questions.length,
                question: question.question,
                options: question.options,
                difficulty: question.difficulty,
                lifelines: player.lifelines
            }));
        }
    });
    
    // Bot auto-answer with delay
    if (room.botDifficulty) {
        const botPlayer = room.players.find(p => p.isBot);
        if (botPlayer) {
            const delay = Math.random() * 2000 + 1000; // 1-3 seconds
            setTimeout(() => {
                botAnswer(room, botPlayer, question);
            }, delay);
        }
    }
}

function botAnswer(room, botPlayer, question) {
    if (botPlayer.answered) return;
    
    botPlayer.answered = true;
    let isCorrect = false;
    
    // Bot difficulty logic
    const difficulty = room.botDifficulty;
    const randomChance = Math.random();
    
    if (difficulty === 'easy') {
        isCorrect = randomChance < 0.4; // 40% correct
    } else if (difficulty === 'medium') {
        isCorrect = randomChance < 0.65; // 65% correct
    } else { // hard
        isCorrect = randomChance < 0.85; // 85% correct
    }
    
    if (isCorrect) {
        const basePoints = { easy: 10, medium: 20, hard: 30 }[question.difficulty] || 10;
        const timeBonus = Math.floor(Math.random() * 5); // Random time bonus
        botPlayer.score += basePoints + timeBonus;
    }
    
    // Notify human player about bot's answer
    const humanPlayer = room.players.find(p => !p.isBot);
    if (humanPlayer && humanPlayer.ws) {
        humanPlayer.ws.send(JSON.stringify({
            type: 'bot_answered',
            botScore: botPlayer.score
        }));
    }
    
    // Check if all answered
    if (room.players.every(p => p.answered)) {
        setTimeout(() => {
            room.currentQuestion++;
            sendQuestion(room);
        }, 3000);
    }
}

function submitAnswer(ws, data) {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.ws === ws);
    if (!player || player.answered) return;
    
    player.answered = true;
    const question = room.questions[room.currentQuestion];
    const isCorrect = data.answer === question.correct;
    
    if (isCorrect) {
        const timeTaken = (Date.now() - room.startTime) / 1000;
        const timeBonus = Math.max(0, Math.floor((room.settings.timeLimit - timeTaken) / 2));
        
        const basePoints = { easy: 10, medium: 20, hard: 30 }[question.difficulty] || 10;
        const points = basePoints + timeBonus;
        player.score += points;
    }
    
    ws.send(JSON.stringify({
        type: 'answer_result',
        correct: isCorrect,
        correctAnswer: question.correct,
        score: player.score
    }));
    
    if (room.players.every(p => p.answered)) {
        setTimeout(() => {
            room.currentQuestion++;
            sendQuestion(room);
        }, 3000);
    }
}

function useLifeline(ws, data) {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.ws === ws);
    if (!player) return;
    
    const question = room.questions[room.currentQuestion];
    
    if (data.lifeline === 'fiftyFifty' && player.lifelines.fiftyFifty) {
        player.lifelines.fiftyFifty = false;
        const wrongOptions = question.options
            .map((opt, idx) => idx)
            .filter(idx => idx !== question.correct);
        const toRemove = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        ws.send(JSON.stringify({
            type: 'lifeline_result',
            lifeline: 'fiftyFifty',
            removeOptions: toRemove
        }));
    } else if (data.lifeline === 'audiencePoll' && player.lifelines.audiencePoll) {
        player.lifelines.audiencePoll = false;
        const poll = [0, 0, 0, 0];
        const correctIdx = question.correct;
        
        for (let i = 0; i < 100; i++) {
            const random = Math.random();
            if (random < 0.7) {
                poll[correctIdx]++;
            } else {
                const wrongIdx = Math.floor(Math.random() * 4);
                poll[wrongIdx]++;
            }
        }
        
        ws.send(JSON.stringify({
            type: 'lifeline_result',
            lifeline: 'audiencePoll',
            poll: poll
        }));
    } else if (data.lifeline === 'skipQuestion' && player.lifelines.skipQuestion) {
        player.lifelines.skipQuestion = false;
        player.answered = true;
        
        if (room.players.every(p => p.answered)) {
            room.currentQuestion++;
            setTimeout(() => sendQuestion(room), 1000);
        }
    }
}

function endQuiz(room) {
    const results = room.players.map(p => ({
        name: p.name,
        score: p.score
    })).sort((a, b) => b.score - a.score);
    
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'quiz_ended',
            results: results
        }));
    });
}

function handleDisconnect(ws) {
    if (ws.roomId) {
        const room = rooms.get(ws.roomId);
        if (room) {
            room.players = room.players.filter(p => p.ws !== ws);
            if (room.players.length === 0) {
                rooms.delete(ws.roomId);
            }
        }
    }
}

server.listen(PORT, () => {
    console.log(`Quiz server running on port ${PORT}`);
});
