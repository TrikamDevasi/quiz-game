const roomManager = require('./roomManager');
const gameEngine = require('./gameEngine');

function handleConnection(ws) {
    console.log('New client connected');

    // Assign unique user ID to track question history
    ws.userId = gameEngine.generateUserId();

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
}

function handleMessage(ws, data) {
    switch (data.type) {
        case 'create_room':
            const room = roomManager.createRoom(ws, data);
            ws.send(JSON.stringify({
                type: 'room_created',
                roomId: room.id
            }));
            break;

        case 'play_solo':
            const soloRoom = roomManager.createSoloRoom(ws, data);

            // Auto-start quiz in solo mode
            ws.send(JSON.stringify({
                type: 'player_joined',
                players: soloRoom.players.map(p => ({ name: p.name }))
            }));

            // Start quiz immediately
            setTimeout(async () => {
                const started = await gameEngine.startQuiz(soloRoom);
                if (started) {
                    gameEngine.sendQuestion(soloRoom);
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to load questions. Please try again.'
                    }));
                }
            }, 500);
            break;

        case 'join_room':
            const result = roomManager.joinRoom(ws, data);
            if (result.error) {
                ws.send(JSON.stringify({ type: 'error', message: result.error }));
                return;
            }

            const joinedRoom = result.room;
            joinedRoom.players.forEach(player => {
                player.ws.send(JSON.stringify({
                    type: 'player_joined',
                    players: joinedRoom.players.map(p => ({ name: p.name, score: p.score }))
                }));
            });
            break;

        case 'start_quiz':
            const roomToStart = roomManager.getRoom(ws.roomId);
            if (!roomToStart || roomToStart.host !== ws) return;

            roomToStart.settings = data.settings;

            gameEngine.startQuiz(roomToStart).then(success => {
                if (success) {
                    roomToStart.players.forEach(player => {
                        if (player.ws) {
                            player.ws.send(JSON.stringify({
                                type: 'quiz_started',
                                settings: roomToStart.settings,
                                totalQuestions: roomToStart.questions.length
                            }));
                        }
                    });

                    setTimeout(() => gameEngine.sendQuestion(roomToStart), 1000);
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to load questions. Please try again.'
                    }));
                }
            });
            break;

        case 'submit_answer':
            const gameRoom = roomManager.getRoom(ws.roomId);
            if (gameRoom) {
                gameEngine.submitAnswer(gameRoom, ws, data);
            }
            break;

        case 'use_lifeline':
            const lifelineRoom = roomManager.getRoom(ws.roomId);
            if (lifelineRoom) {
                gameEngine.useLifeline(lifelineRoom, ws, data);
            }
            break;
    }
}

function handleDisconnect(ws) {
    const room = roomManager.removePlayer(ws);
    // If we want to notify other players that someone left:
    if (room && room.players.length > 0) {
        // Maybe end game or notify?
        // For now, if room is not deleted, it means there are other players
        // But logic in server.js just deleted room if empty.
        // If multiplayer, maybe notify others?
        // Original code didn't explicitly notify others on disconnect but removed from list.
        // Let's stick to original behavior + roomManager cleaned it up.
    }
}

module.exports = { handleConnection };
