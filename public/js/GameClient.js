import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';

class GameClient {
    /**
     * Initialize game client
     */
    constructor() {
        this.ws = null;
        this.ui = new UIManager(this);
        this.audio = new AudioManager();
        this.currentRoomId = null;
        this.currentSettings = null;
        this.isMuted = false;

        this.connectWebSocket();
    }

    toggleSound() {
        this.isMuted = !this.isMuted;
        this.ui.elements.soundToggleBtn.textContent = this.isMuted ? '🔇' : '🔊';
        this.ui.elements.soundToggleBtn.classList.toggle('muted', this.isMuted);
    }

    connectWebSocket() {
        // Auto-detect WebSocket protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected');
            this.ui.updateConnectionStatus('connected');
        };

        this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));

        this.ws.onclose = () => {
            this.ui.updateConnectionStatus('disconnected');
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    handleMessage(data) {
        console.log('Received:', data);
        switch (data.type) {
            case 'room_created':
                this.currentRoomId = data.roomId;
                this.ui.displayRoomId(data.roomId);
                this.ui.showScreen('waiting');
                break;
            case 'player_joined':
                this.ui.updatePlayersList(data.players);
                if (data.players.length === 1 && !this.isSolo) {
                    // Host waiting
                } else if (this.isSolo) {
                    this.ui.showScreen('loading');
                }
                break;
            case 'quiz_started':
                this.currentSettings = data.settings;
                this.ui.showScreen('loading'); // Show loading briefly logic could be improved
                setTimeout(() => this.ui.showScreen('quiz'), 500);
                this.audio.play('background');
                break;
            case 'new_question':
                this.ui.showScreen('quiz'); // Ensure quiz screen is shown
                this.ui.displayQuestion(data);
                this.audio.play('click'); // Sound effect for new question
                break;
            case 'answer_result':
                this.ui.showAnswerResult(data);
                if (data.correct) this.audio.play('correct');
                else this.audio.play('wrong');
                break;
            case 'quiz_ended':
                this.ui.showResults(data.results);
                break;
            case 'error':
                alert(data.message);
                break;
        }
    }

    startSoloGame(data) {
        this.isSolo = true;
        this.currentSettings = data.settings;
        this.send({
            type: 'play_solo',
            playerName: data.playerName,
            settings: data.settings
        });
    }

    createRoom(playerName) {
        this.isSolo = false;
        this.send({ type: 'create_room', playerName });
    }

    joinRoom(playerName, roomId) {
        this.isSolo = false;
        this.send({ type: 'join_room', playerName, roomId });
    }

    startMultiplayerQuiz(settings) {
        this.send({ type: 'start_quiz', settings });
    }

    submitAnswer(index) {
        this.send({ type: 'submit_answer', answer: index });
        this.audio.play('click');
    }
}

// Initialize
window.gameClient = new GameClient();
