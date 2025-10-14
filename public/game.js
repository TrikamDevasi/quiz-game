// WebSocket connection
let ws;
let currentRoomId = null;
let currentQuestionData = null;
let timerInterval = null;

// DOM Elements
const menuScreen = document.getElementById('menuScreen');
const waitingScreen = document.getElementById('waitingScreen');
const loadingScreen = document.getElementById('loadingScreen');
const quizScreen = document.getElementById('quizScreen');
const resultsScreen = document.getElementById('resultsScreen');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');

const playerNameInput = document.getElementById('playerNameInput');
const playSoloBtn = document.getElementById('playSoloBtn');
const soloSettingsSection = document.getElementById('soloSettingsSection');
const startSoloBtn = document.getElementById('startSoloBtn');
const soloCategorySelect = document.getElementById('soloCategorySelect');
const soloQuestionCountSelect = document.getElementById('soloQuestionCountSelect');
const soloTimeLimitSelect = document.getElementById('soloTimeLimitSelect');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinRoomSection = document.getElementById('joinRoomSection');
const roomIdInput = document.getElementById('roomIdInput');
const joinRoomConfirmBtn = document.getElementById('joinRoomConfirmBtn');

const displayRoomId = document.getElementById('displayRoomId');
const copyRoomIdBtn = document.getElementById('copyRoomIdBtn');
const playersList = document.getElementById('playersList');
const categorySelect = document.getElementById('categorySelect');
const questionCountSelect = document.getElementById('questionCountSelect');
const timeLimitSelect = document.getElementById('timeLimitSelect');
const startQuizBtn = document.getElementById('startQuizBtn');

const questionCounter = document.getElementById('questionCounter');
const timer = document.getElementById('timer');
const scoreBoard = document.getElementById('scoreBoard');
const difficultyBadge = document.getElementById('difficultyBadge');
const questionText = document.getElementById('questionText');
const optionsGrid = document.getElementById('optionsGrid');
const optionBtns = document.querySelectorAll('.option-btn');

const fiftyFiftyBtn = document.getElementById('fiftyFiftyBtn');
const audiencePollBtn = document.getElementById('audiencePollBtn');
const skipQuestionBtn = document.getElementById('skipQuestionBtn');

const resultsContent = document.getElementById('resultsContent');
const backToMenuBtn = document.getElementById('backToMenuBtn');

const audiencePollModal = document.getElementById('audiencePollModal');
const pollResults = document.getElementById('pollResults');
const closePollBtn = document.getElementById('closePollBtn');

// Initialize WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
        updateConnectionStatus('connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('disconnected');
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        updateConnectionStatus('disconnected');
        setTimeout(connectWebSocket, 3000);
    };
}

function updateConnectionStatus(status) {
    connectionStatus.className = `status-bar ${status}`;
    statusText.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
}

function handleServerMessage(data) {
    console.log('Received:', data);
    
    switch (data.type) {
        case 'room_created':
            currentRoomId = data.roomId;
            showWaitingScreen();
            break;
        case 'player_joined':
            updatePlayersList(data.players);
            // If solo mode (only 1 player), show loading screen
            if (data.players.length === 1) {
                menuScreen.classList.remove('active');
                loadingScreen.classList.add('active');
            }
            break;
        case 'quiz_started':
            loadingScreen.classList.remove('active');
            showQuizScreen();
            break;
        case 'new_question':
            displayQuestion(data);
            break;
        case 'answer_result':
            showAnswerResult(data);
            break;
        case 'lifeline_result':
            handleLifelineResult(data);
            break;
        case 'quiz_ended':
            showResults(data.results);
            break;
        case 'error':
            alert(data.message);
            break;
    }
}

// Event Listeners
playSoloBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    soloSettingsSection.classList.toggle('hidden');
});

startSoloBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const category = soloCategorySelect.value;
    const questionCount = parseInt(soloQuestionCountSelect.value);
    const timeLimit = parseInt(soloTimeLimitSelect.value);
    
    ws.send(JSON.stringify({
        type: 'play_solo',
        playerName: playerName,
        settings: {
            category: category,
            questionCount: questionCount,
            timeLimit: timeLimit
        }
    }));
});

createRoomBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'create_room',
        playerName: playerName
    }));
});

joinRoomBtn.addEventListener('click', () => {
    joinRoomSection.classList.toggle('hidden');
});

joinRoomConfirmBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim().toUpperCase();
    
    if (!playerName || !roomId) {
        alert('Please enter your name and room ID');
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'join_room',
        playerName: playerName,
        roomId: roomId
    }));
});

copyRoomIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomId).then(() => {
        copyRoomIdBtn.textContent = '✓';
        setTimeout(() => {
            copyRoomIdBtn.textContent = '📋';
        }, 2000);
    });
});

startQuizBtn.addEventListener('click', () => {
    const settings = {
        category: categorySelect.value,
        questionCount: parseInt(questionCountSelect.value),
        timeLimit: parseInt(timeLimitSelect.value)
    };
    
    ws.send(JSON.stringify({
        type: 'start_quiz',
        settings: settings
    }));
});

optionBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled') || btn.classList.contains('removed')) return;
        
        optionBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        ws.send(JSON.stringify({
            type: 'submit_answer',
            answer: index
        }));
        
        optionBtns.forEach(b => b.classList.add('disabled'));
    });
});

fiftyFiftyBtn.addEventListener('click', () => {
    if (fiftyFiftyBtn.classList.contains('used')) return;
    
    ws.send(JSON.stringify({
        type: 'use_lifeline',
        lifeline: 'fiftyFifty'
    }));
});

audiencePollBtn.addEventListener('click', () => {
    if (audiencePollBtn.classList.contains('used')) return;
    
    ws.send(JSON.stringify({
        type: 'use_lifeline',
        lifeline: 'audiencePoll'
    }));
});

skipQuestionBtn.addEventListener('click', () => {
    if (skipQuestionBtn.classList.contains('used')) return;
    
    ws.send(JSON.stringify({
        type: 'use_lifeline',
        lifeline: 'skipQuestion'
    }));
    
    skipQuestionBtn.classList.add('used');
});

closePollBtn.addEventListener('click', () => {
    audiencePollModal.classList.add('hidden');
});

backToMenuBtn.addEventListener('click', () => {
    location.reload();
});

// Screen Management
function showWaitingScreen() {
    menuScreen.classList.remove('active');
    waitingScreen.classList.add('active');
    displayRoomId.textContent = currentRoomId;
}

function showQuizScreen() {
    waitingScreen.classList.remove('active');
    quizScreen.classList.add('active');
}

function showResults(results) {
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');
    
    resultsContent.innerHTML = results.map((player, index) => `
        <div class="result-item ${index === 0 ? 'winner' : ''}">
            <div class="result-header">
                <span class="result-name">${index === 0 ? '🏆 ' : ''}${player.name}</span>
                <span class="result-score">${player.score} pts</span>
            </div>
            <div class="result-stats">
                <span class="stat-correct">✅ Correct: ${player.correct || 0}</span>
                <span class="stat-wrong">❌ Wrong: ${player.wrong || 0}</span>
            </div>
        </div>
    `).join('');
}

function updatePlayersList(players) {
    playersList.innerHTML = players.map(player => `
        <div class="player-item">
            <span class="player-icon">👤</span>
            <span>${player.name}</span>
        </div>
    `).join('');
}

function displayQuestion(data) {
    currentQuestionData = data;
    
    questionCounter.textContent = `Question ${data.questionNumber}/${data.totalQuestions}`;
    questionText.textContent = data.question;
    
    difficultyBadge.textContent = data.difficulty;
    difficultyBadge.className = `difficulty-badge ${data.difficulty}`;
    
    optionBtns.forEach((btn, index) => {
        btn.classList.remove('disabled', 'selected', 'correct', 'wrong', 'removed');
        btn.querySelector('.option-text').textContent = data.options[index];
    });
    
    // Update lifelines
    fiftyFiftyBtn.classList.toggle('used', !data.lifelines.fiftyFifty);
    audiencePollBtn.classList.toggle('used', !data.lifelines.audiencePoll);
    skipQuestionBtn.classList.toggle('used', !data.lifelines.skipQuestion);
    
    // Start timer
    startTimer(data);
}

function startTimer(data) {
    if (timerInterval) clearInterval(timerInterval);
    
    let timeLeft = parseInt(timeLimitSelect.value);
    timer.textContent = `${timeLeft}s`;
    timer.classList.remove('warning');
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timer.textContent = `${timeLeft}s`;
        
        if (timeLeft <= 10) {
            timer.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function showAnswerResult(data) {
    if (timerInterval) clearInterval(timerInterval);
    
    optionBtns.forEach((btn, index) => {
        if (index === data.correctAnswer) {
            btn.classList.add('correct');
        } else if (btn.classList.contains('selected')) {
            btn.classList.add('wrong');
        }
    });
    
    // Update score
    updateScoreBoard();
}

function updateScoreBoard() {
    // This will be updated when we receive player scores from server
    // For now, just a placeholder
}

function handleLifelineResult(data) {
    if (data.lifeline === 'fiftyFifty') {
        fiftyFiftyBtn.classList.add('used');
        data.removeOptions.forEach(index => {
            optionBtns[index].classList.add('removed');
        });
    } else if (data.lifeline === 'audiencePoll') {
        audiencePollBtn.classList.add('used');
        showAudiencePoll(data.poll);
    }
}

function showAudiencePoll(poll) {
    const letters = ['A', 'B', 'C', 'D'];
    pollResults.innerHTML = poll.map((percentage, index) => `
        <div class="poll-item">
            <div class="poll-label">
                <span>Option ${letters[index]}</span>
                <span>${percentage}%</span>
            </div>
            <div class="poll-bar">
                <div class="poll-fill" style="width: ${percentage}%">${percentage}%</div>
            </div>
        </div>
    `).join('');
    
    audiencePollModal.classList.remove('hidden');
}

// Initialize
connectWebSocket();
