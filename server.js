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

// Track used questions per user session (prevents repeats)
const userQuestionHistory = new Map();

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateUserId() {
    return Math.random().toString(36).substring(2, 15);
}

function shuffleOptions(question) {
    // Create array of options with their original indices
    const optionsWithIndices = question.options.map((option, index) => ({
        text: option,
        originalIndex: index
    }));
    
    // Shuffle the options
    for (let i = optionsWithIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithIndices[i], optionsWithIndices[j]] = [optionsWithIndices[j], optionsWithIndices[i]];
    }
    
    // Find new position of correct answer
    const newCorrectIndex = optionsWithIndices.findIndex(
        opt => opt.originalIndex === question.correct
    );
    
    return {
        question: question.question,
        options: optionsWithIndices.map(opt => opt.text),
        correct: newCorrectIndex,
        difficulty: question.difficulty
    };
}

function getUniqueQuestions(userId, category, count) {
    // Get all questions from category or random mix
    let allQuestions = [];
    
    if (category === 'random') {
        // Mix questions from all categories
        Object.values(quizQuestions).forEach(categoryQuestions => {
            allQuestions = allQuestions.concat(categoryQuestions);
        });
    } else {
        allQuestions = [...(quizQuestions[category] || [])];
    }
    
    // Get user's question history
    if (!userQuestionHistory.has(userId)) {
        userQuestionHistory.set(userId, new Set());
    }
    const usedQuestions = userQuestionHistory.get(userId);
    
    // Filter out used questions
    let availableQuestions = allQuestions.filter((q, index) => {
        const questionId = `${category}_${index}_${q.question}`;
        return !usedQuestions.has(questionId);
    });
    
    // If not enough unused questions, reset history for this user
    if (availableQuestions.length < count) {
        console.log(`Resetting question history for user ${userId}`);
        usedQuestions.clear();
        availableQuestions = [...allQuestions];
    }
    
    // Shuffle and select questions
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(count, shuffled.length));
    
    // Shuffle options for each question
    const questionsWithShuffledOptions = selectedQuestions.map(q => shuffleOptions(q));
    
    // Mark selected questions as used
    selectedQuestions.forEach((q, index) => {
        const questionId = `${category}_${index}_${q.question}`;
        usedQuestions.add(questionId);
    });
    
    return questionsWithShuffledOptions;
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Assign unique user ID to track question history
    ws.userId = generateUserId();
    
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
        case 'play_solo':
            playSolo(ws, data);
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
        players: [{ ws, name: data.playerName, score: 0, answered: false, correct: 0, wrong: 0 }],
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

function playSolo(ws, data) {
    const roomId = generateRoomId();
    const room = {
        id: roomId,
        host: ws,
        players: [
            { ws, name: data.playerName, score: 0, answered: false, correct: 0, wrong: 0 }
        ],
        settings: data.settings || {
            category: 'random',
            questionCount: 10,
            timeLimit: 30
        },
        currentQuestion: 0,
        questions: [],
        startTime: null,
        lifelines: {},
        isSolo: true
    };
    
    rooms.set(roomId, room);
    ws.roomId = roomId;
    
    // Auto-start quiz in solo mode
    ws.send(JSON.stringify({
        type: 'player_joined',
        players: room.players.map(p => ({ name: p.name }))
    }));
    
    // Start quiz immediately
    setTimeout(() => {
        startQuiz(ws, {
            settings: room.settings
        });
    }, 500);
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
    
    room.players.push({ ws, name: data.playerName, score: 0, answered: false, correct: 0, wrong: 0 });
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
    
    // Get unique questions that haven't been used by this user
    room.questions = getUniqueQuestions(
        ws.userId,
        data.settings.category,
        data.settings.questionCount
    );
    room.currentQuestion = 0;
    
    room.players.forEach(player => {
        player.lifelines = {
            fiftyFifty: true,
            audiencePoll: true,
            skipQuestion: true
        };
    });
    
    room.players.forEach(player => {
        if (player.ws) {
            player.ws.send(JSON.stringify({
                type: 'quiz_started',
                settings: room.settings,
                totalQuestions: room.questions.length
            }));
        }
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
        player.correct++;
        const timeTaken = (Date.now() - room.startTime) / 1000;
        const timeBonus = Math.max(0, Math.floor((room.settings.timeLimit - timeTaken) / 2));
        
        const basePoints = { easy: 10, medium: 20, hard: 30 }[question.difficulty] || 10;
        const points = basePoints + timeBonus;
        player.score += points;
    } else {
        player.wrong++;
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
        score: p.score,
        correct: p.correct,
        wrong: p.wrong
    })).sort((a, b) => b.score - a.score);
    
    room.players.forEach(player => {
        if (player.ws) {
            player.ws.send(JSON.stringify({
                type: 'quiz_ended',
                results: results
            }));
        }
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
    
    // Note: We keep user question history even after disconnect
    // so questions don't repeat when they reconnect
    // History is automatically cleaned up after server restart
}

// Clean up old user histories every hour (prevent memory leaks)
setInterval(() => {
    const maxHistorySize = 1000; // Keep max 1000 users
    if (userQuestionHistory.size > maxHistorySize) {
        console.log(`Cleaning up old question histories. Current size: ${userQuestionHistory.size}`);
        const entries = Array.from(userQuestionHistory.entries());
        // Keep only the most recent 500
        userQuestionHistory.clear();
        entries.slice(-500).forEach(([key, value]) => {
            userQuestionHistory.set(key, value);
        });
        console.log(`Cleaned up. New size: ${userQuestionHistory.size}`);
    }
}, 3600000); // Every hour

server.listen(PORT, () => {
    console.log(`Quiz server running on port ${PORT}`);
});
