const MAX_PLAYERS = 2; // Or configurable

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * Creates a multiplayer room
     * @param {WebSocket} host - The host's socket
     * @param {Object} data - Room data
     * @returns {Object} Created room
     */
    createRoom(host, data) {
        const roomId = this.generateRoomId();
        const room = {
            id: roomId,
            host: host,
            players: [{ ws: host, name: data.playerName, score: 0, answered: false, correct: 0, wrong: 0 }],
            settings: null,
            currentQuestion: 0,
            questions: [],
            startTime: null,
            lifelines: {},
            botDifficulty: null,
            isSolo: false
        };

        this.rooms.set(roomId, room);
        host.roomId = roomId;

        return room;
    }

    /**
     * Creates a solo room
     * @param {WebSocket} host - The host's socket
     * @param {Object} data - Game data
     * @returns {Object} Created room
     */
    createSoloRoom(host, data) {
        const roomId = this.generateRoomId();
        const room = {
            id: roomId,
            host: host,
            players: [
                { ws: host, name: data.playerName, score: 0, answered: false, correct: 0, wrong: 0 }
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

        this.rooms.set(roomId, room);
        host.roomId = roomId;

        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Adds a player to a room
     * @param {WebSocket} ws - Player socket
     * @param {Object} data - Join data
     * @returns {Object} Result object
     */
    joinRoom(ws, data) {
        const room = this.rooms.get(data.roomId);

        if (!room) {
            return { error: 'Room not found' };
        }

        if (room.players.length >= MAX_PLAYERS) {
            return { error: 'Room is full' };
        }

        room.players.push({ ws, name: data.playerName, score: 0, answered: false, correct: 0, wrong: 0 });
        ws.roomId = data.roomId;

        return { room };
    }

    removePlayer(ws) {
        if (ws.roomId) {
            const room = this.rooms.get(ws.roomId);
            if (room) {
                room.players = room.players.filter(p => p.ws !== ws);
                if (room.players.length === 0) {
                    this.rooms.delete(ws.roomId);
                }
                return room;
            }
        }
        return null;
    }
}

module.exports = new RoomManager();
