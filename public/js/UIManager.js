export class UIManager {
    /**
     * @param {GameClient} gameClient - Reference to game client
     */
    constructor(gameClient) {
        this.game = gameClient;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Screens
        this.screens = {
            menu: document.getElementById('menuScreen'),
            waiting: document.getElementById('waitingScreen'),
            loading: document.getElementById('loadingScreen'),
            quiz: document.getElementById('quizScreen'),
            results: document.getElementById('resultsScreen')
        };

        // Inputs & Buttons
        this.elements = {
            playerNameInput: document.getElementById('playerNameInput'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            joinRoomSection: document.getElementById('joinRoomSection'),
            roomIdInput: document.getElementById('roomIdInput'),
            joinRoomConfirmBtn: document.getElementById('joinRoomConfirmBtn'),
            playSoloBtn: document.getElementById('playSoloBtn'),
            soloSettingsSection: document.getElementById('soloSettingsSection'),
            startSoloBtn: document.getElementById('startSoloBtn'),
            displayRoomId: document.getElementById('displayRoomId'),
            playersList: document.getElementById('playersList'),
            questionCounter: document.getElementById('questionCounter'),
            timer: document.getElementById('timer'),
            questionText: document.getElementById('questionText'),
            optionsGrid: document.getElementById('optionsGrid'),
            optionBtns: document.querySelectorAll('.option-btn'),
            difficultyBadge: document.getElementById('difficultyBadge'),
            scoreBoard: document.getElementById('scoreBoard'),
            resultsContent: document.getElementById('resultsContent'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusText: document.getElementById('statusText'),
            howToPlayBtn: document.getElementById('howToPlayBtn'),
            howToPlayModal: document.getElementById('howToPlayModal'),
            closeHowToPlayBtn: document.getElementById('closeHowToPlayBtn'),
            soundToggleBtn: document.getElementById('soundToggleBtn')
        };
    }

    attachEventListeners() {
        this.elements.playSoloBtn.addEventListener('click', () => {
            const name = this.elements.playerNameInput.value.trim();
            if (!name) return alert('Please enter your name');
            this.elements.soloSettingsSection.classList.toggle('hidden');
        });

        this.elements.startSoloBtn.addEventListener('click', () => {
            this.game.startSoloGame(this.getSoloSettings());
        });

        this.elements.createRoomBtn.addEventListener('click', () => {
            const name = this.elements.playerNameInput.value.trim();
            if (!name) return alert('Please enter your name');
            this.game.createRoom(name);
        });

        this.elements.joinRoomBtn.addEventListener('click', () => {
            this.elements.joinRoomSection.classList.toggle('hidden');
        });

        this.elements.joinRoomConfirmBtn.addEventListener('click', () => {
            const name = this.elements.playerNameInput.value.trim();
            const roomId = this.elements.roomIdInput.value.trim().toUpperCase();
            if (name && roomId) this.game.joinRoom(name, roomId);
            else alert('Please enter name and room ID');
        });

        this.elements.optionBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => this.game.submitAnswer(index));
        });

        document.getElementById('startQuizBtn').addEventListener('click', () => {
            this.game.startMultiplayerQuiz(this.getMultiplayerSettings());
        });

        document.getElementById('backToMenuBtn').addEventListener('click', () => location.reload());

        if (this.elements.howToPlayBtn) {
            this.elements.howToPlayBtn.addEventListener('click', () => {
                this.elements.howToPlayModal.classList.remove('hidden');
            });
        }

        if (this.elements.closeHowToPlayBtn) {
            this.elements.closeHowToPlayBtn.addEventListener('click', () => {
                this.elements.howToPlayModal.classList.add('hidden');
            });
        }

        if (this.elements.soundToggleBtn) {
            this.elements.soundToggleBtn.addEventListener('click', () => {
                this.game.toggleSound();
            });
        }
    }

    getSoloSettings() {
        return {
            playerName: this.elements.playerNameInput.value.trim(),
            settings: {
                category: document.getElementById('soloCategorySelect').value,
                questionCount: parseInt(document.getElementById('soloQuestionCountSelect').value),
                timeLimit: parseInt(document.getElementById('soloTimeLimitSelect').value)
            }
        };
    }

    getMultiplayerSettings() {
        return {
            category: document.getElementById('categorySelect').value,
            questionCount: parseInt(document.getElementById('questionCountSelect').value),
            timeLimit: parseInt(document.getElementById('timeLimitSelect').value)
        };
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        if (this.screens[screenName]) this.screens[screenName].classList.add('active');
    }

    updateConnectionStatus(status) {
        this.elements.connectionStatus.className = `status-bar ${status}`;
        this.elements.statusText.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
    }

    displayRoomId(id) {
        this.elements.displayRoomId.textContent = id;
    }

    updatePlayersList(players) {
        this.elements.playersList.innerHTML = players.map(p => `
            <div class="player-item">
                <span class="player-icon">👤</span>
                <span>${p.name} ${p.score !== undefined ? `(${p.score} pts)` : ''}</span>
            </div>
        `).join('');

        // Also update scoreboard if in quiz
        this.updateScoreBoard(players);
    }

    updateScoreBoard(players) {
        if (!this.elements.scoreBoard) return;
        this.elements.scoreBoard.innerHTML = players.map(p => `
            <div class="score-item">
                <span class="score-name">${p.name}:</span>
                <span class="score-value">${p.score}</span>
            </div>
        `).join('');
    }

    displayQuestion(data) {
        this.elements.questionCounter.textContent = `Question ${data.questionNumber}/${data.totalQuestions}`;
        this.elements.questionText.textContent = data.question;
        this.elements.difficultyBadge.textContent = data.difficulty;
        this.elements.difficultyBadge.className = `difficulty-badge ${data.difficulty}`;

        this.elements.optionBtns.forEach((btn, index) => {
            btn.classList.remove('disabled', 'selected', 'correct', 'wrong', 'removed');
            btn.querySelector('.option-text').textContent = data.options[index];
        });

        this.startTimer(this.game.currentSettings?.timeLimit || 30);
    }

    startTimer(seconds) {
        clearInterval(this.timerInterval);
        let timeLeft = seconds;
        this.elements.timer.textContent = `${timeLeft}s`;
        this.elements.timer.classList.remove('warning');

        this.timerInterval = setInterval(() => {
            timeLeft--;
            this.elements.timer.textContent = `${timeLeft}s`;
            if (timeLeft <= 10) this.elements.timer.classList.add('warning');
            if (timeLeft <= 0) clearInterval(this.timerInterval);
        }, 1000);
    }

    showAnswerResult(data) {
        clearInterval(this.timerInterval);
        this.elements.optionBtns.forEach((btn, index) => {
            if (index === data.correctAnswer) btn.classList.add('correct');
            else if (btn.classList.contains('selected')) btn.classList.add('wrong');
            btn.classList.add('disabled');
        });
    }

    showResults(results) {
        this.showScreen('results');
        this.elements.resultsContent.innerHTML = results.map((player, index) => `
            <div class="result-item ${index === 0 ? 'winner' : ''}">
                <div class="result-header">
                    <span class="result-name">${index === 0 ? '🏆 ' : ''}${player.name}</span>
                    <span class="result-score">${player.score} pts</span>
                </div>
                <div class="result-stats">
                    <span class="stat-correct">✅ Correct: ${player.correct}</span>
                    <span class="stat-wrong">❌ Wrong: ${player.wrong}</span>
                </div>
            </div>
        `).join('');
    }
}
