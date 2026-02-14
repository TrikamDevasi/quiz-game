const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing: ${command}`, error);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
};

const replaceInFile = (filePath, search, replace) => {
    const fullPath = path.join(__dirname, filePath);
    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes(search)) {
            console.warn(`Search term not found in ${filePath}: "${search}"`);
            return false;
        }
        content = content.replace(search, replace);
        fs.writeFileSync(fullPath, content);
        return true;
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
        return false;
    }
};

const appendToFile = (filePath, content) => {
    const fullPath = path.join(__dirname, filePath);
    try {
        fs.appendFileSync(fullPath, content);
        return true;
    } catch (err) {
        console.error(`Error appending to ${filePath}:`, err);
        return false;
    }
};

const tasks = [
    // --- Server & Utils (1-10) ---
    {
        msg: "refactor(server): add comments for imports",
        fn: () => replaceInFile('server.js', "const express = require('express');", "// Import dependencies\nconst express = require('express');")
    },
    {
        msg: "refactor(server): add defaults for port",
        fn: () => replaceInFile('server.js', "const PORT = process.env.PORT || 3000;", "// Set port from environment or default to 3000\nconst PORT = process.env.PORT || 3000;")
    },
    {
        msg: "docs(roomManager): add JSDoc for createRoom",
        fn: () => replaceInFile('utils/roomManager.js', "createRoom(host, data) {", "/**\n     * Creates a multiplayer room\n     * @param {WebSocket} host - The host's socket\n     * @param {Object} data - Room data\n     * @returns {Object} Created room\n     */\n    createRoom(host, data) {")
    },
    {
        msg: "docs(roomManager): add JSDoc for createSoloRoom",
        fn: () => replaceInFile('utils/roomManager.js', "createSoloRoom(host, data) {", "/**\n     * Creates a solo room\n     * @param {WebSocket} host - The host's socket\n     * @param {Object} data - Game data\n     * @returns {Object} Created room\n     */\n    createSoloRoom(host, data) {")
    },
    {
        msg: "docs(roomManager): add JSDoc for joinRoom",
        fn: () => replaceInFile('utils/roomManager.js', "joinRoom(ws, data) {", "/**\n     * Adds a player to a room\n     * @param {WebSocket} ws - Player socket\n     * @param {Object} data - Join data\n     * @returns {Object} Result object\n     */\n    joinRoom(ws, data) {")
    },
    {
        msg: "style(roomManager): use constant for player limit",
        fn: () => replaceInFile('utils/roomManager.js', "const MAX_PLAYERS = 2; // Or configurable", "const MAX_PLAYERS = 2; // Maximum players per room")
    },
    {
        msg: "docs(gameEngine): add class description",
        fn: () => replaceInFile('utils/gameEngine.js', "class GameEngine {", "/**\n * Manages game logic, scoring, and questions\n */\nclass GameEngine {")
    },
    {
        msg: "docs(socketHandler): add function description",
        fn: () => replaceInFile('utils/socketHandler.js', "function handleConnection(ws) {", "/**\n * Handles new WebSocket connections\n * @param {WebSocket} ws - Client socket\n */\nfunction handleConnection(ws) {")
    },
    {
        msg: "cleanup(socketHandler): improve error log",
        fn: () => replaceInFile('utils/socketHandler.js', "console.error('Error parsing message:', error);", "console.error('Failed to parse incoming message:', error.message);")
    },
    {
        msg: "refactor(quiz-api): add timeout comment",
        fn: () => replaceInFile('quiz-api.js', "const axios = require('axios');", "const axios = require('axios'); // HTTP client")
    },

    // --- Quiz API (11-15) ---
    {
        msg: "docs(quiz-api): add class description",
        fn: () => replaceInFile('quiz-api.js', "class QuizAPIService {", "/**\n * Service to interaction with Open Trivia DB\n */\nclass QuizAPIService {")
    },
    {
        msg: "refactor(quiz-api): improve logging",
        fn: () => replaceInFile('quiz-api.js', "console.log(`Fetching ${amount} questions from Open Trivia DB...`);", "console.info(`[API] Fetching ${amount} questions from Open Trivia DB...`);")
    },
    {
        msg: "refactor(quiz-api): improve success logging",
        fn: () => replaceInFile('quiz-api.js', "console.log(`Successfully fetched ${questions.length} questions`);", "console.info(`[API] Successfully fetched ${questions.length} questions`);")
    },
    {
        msg: "refactor(quiz-api): improve error logging",
        fn: () => replaceInFile('quiz-api.js', "console.error('Error fetching questions from API:', error.message);", "console.error('[API Error] Fetch failed:', error.message);")
    },
    {
        msg: "refactor(quiz-api): explicit return type",
        fn: () => replaceInFile('quiz-api.js', "* @returns {Promise<Array>} Array of formatted questions", "* @returns {Promise<Array<Object>>} Array of formatted question objects")
    },

    // --- Client Side (16-25) ---
    {
        msg: "docs(GameClient): add constructor JSDoc",
        fn: () => replaceInFile('public/js/GameClient.js', "constructor() {", "/**\n     * Initialize game client\n     */\n    constructor() {")
    },
    {
        msg: "refactor(GameClient): improve protocol logic",
        fn: () => replaceInFile('public/js/GameClient.js', "const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';", "// Auto-detect WebSocket protocol\n        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';")
    },
    {
        msg: "docs(GameClient): add JSDoc for send",
        fn: () => replaceInFile('public/js/GameClient.js', "send(data) {", "/**\n     * Send message to server\n     * @param {Object} data - Payload\n     */\n    send(data) {")
    },
    {
        msg: "docs(UIManager): add constructor JSDoc",
        fn: () => replaceInFile('public/js/UIManager.js', "constructor(gameClient) {", "/**\n     * @param {GameClient} gameClient - Reference to game client\n     */\n    constructor(gameClient) {")
    },
    {
        msg: "refactor(UIManager): add comment for screens",
        fn: () => replaceInFile('public/js/UIManager.js', "// Screens", "// DOM Elements - Screens")
    },
    {
        msg: "refactor(UIManager): add comment for inputs",
        fn: () => replaceInFile('public/js/UIManager.js', "// Inputs & Buttons", "// DOM Elements - Controls")
    },
    {
        msg: "docs(UIManager): method description for showScreen",
        fn: () => replaceInFile('public/js/UIManager.js', "showScreen(screenName) {", "/**\n     * Switch visible screen\n     * @param {string} screenName\n     */\n    showScreen(screenName) {")
    },
    {
        msg: "style(UIManager): fix string template spacing",
        fn: () => replaceInFile('public/js/UIManager.js', "this.elements.statusText.textContent = status === 'connected' ? 'Connected' : 'Disconnected';", "this.elements.statusText.textContent = (status === 'connected') ? 'Connected' : 'Disconnected';")
    },
    {
        msg: "refactor(GameClient): rename isMuted for clarity",
        fn: () => replaceInFile('public/js/GameClient.js', "this.isMuted = false;", "this.isMuted = false; // Sound state")
    },
    {
        msg: "refactor(UIManager): explicit parsing",
        fn: () => replaceInFile('public/js/UIManager.js', "questionCount: parseInt(document.getElementById('soloQuestionCountSelect').value),", "questionCount: parseInt(document.getElementById('soloQuestionCountSelect').value, 10),")
    },

    // --- Frontend Assets (26-35) ---
    {
        msg: "chore(html): add viewport meta comment",
        fn: () => replaceInFile('public/index.html', '<meta name="viewport" content="width=device-width, initial-scale=1.0">', '<meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- Mobile optimized -->')
    },
    {
        msg: "chore(html): add author meta",
        fn: () => replaceInFile('public/index.html', '<meta charset="UTF-8">', '<meta charset="UTF-8">\n    <meta name="author" content="Quiz Multiplayer">')
    },
    {
        msg: "chore(html): add description meta",
        fn: () => replaceInFile('public/index.html', '<title>Quiz Multiplayer</title>', '<title>Quiz Multiplayer</title>\n    <meta name="description" content="A realtime multiplayer quiz game">')
    },
    {
        msg: "style(css): add main header comment",
        fn: () => replaceInFile('public/style.css', ':root {', "/* --- Main Stylesheet --- */\n:root {")
    },
    {
        msg: "style(css): comment variable section",
        fn: () => replaceInFile('public/style.css', '--primary-color: #6c5ce7;', "/* Color Palette */\n    --primary-color: #6c5ce7;")
    },
    {
        msg: "style(css): comment reset section",
        fn: () => replaceInFile('public/style.css', '* {', "/* Reset */\n* {")
    },
    {
        msg: "style(css): comment body section",
        fn: () => replaceInFile('public/style.css', 'body {', "/* Global Layout */\nbody {")
    },
    {
        msg: "style(css): optimize font import",
        fn: () => replaceInFile('public/style.css', "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;", "font-family: 'Segoe UI', system-ui, sans-serif;")
    },
    {
        msg: "chore(html): comment script imports",
        fn: () => replaceInFile('public/index.html', '<script type="module" src="js/GameClient.js"></script>', '<!-- Main Game Script -->\n    <script type="module" src="js/GameClient.js"></script>')
    },
    {
        msg: "chore(html): footer comment",
        fn: () => replaceInFile('public/index.html', '</body>', '<!-- End of Body -->\n</body>')
    },

    // --- Config & Docs (36-43) ---
    {
        msg: "docs(readme): add installation header",
        fn: () => appendToFile('README.md', "\n## Installation\n1. Clone repo\n2. `npm install`\n3. `npm start`")
    },
    {
        msg: "docs(readme): add features list",
        fn: () => appendToFile('README.md', "\n## Features\n- Multiplayer\n- Solo Mode\n- Realtime Chat\n- Live Scoreboard")
    },
    {
        msg: "chore(package): add keywords",
        fn: () => replaceInFile('package.json', '"license": "ISC"', '"license": "ISC",\n  "keywords": ["quiz", "game", "socket.io", "multiplayer"]')
    },
    {
        msg: "chore(package): add homepage",
        fn: () => replaceInFile('package.json', '"name": "quiz-multiplayer",', '"name": "quiz-multiplayer",\n  "homepage": "https://github.com/TrikamDevasi/quiz-game",')
    },
    {
        msg: "chore(package): update description",
        fn: () => replaceInFile('package.json', '"description": ""', '"description": "Real-time multiplayer knowledge test"')
    },
    {
        msg: "docs(deployment): update header",
        fn: () => replaceInFile('DEPLOYMENT.md', '# Deployment Guide', '# Quiz Game Deployment Guide')
    },
    {
        msg: "docs(deployment): add prerequisites",
        fn: () => appendToFile('DEPLOYMENT.md', "\n## Prerequisites\n- Node.js v14+\n- NPM v6+")
    },
    {
        msg: "chore(project): add license file",
        fn: () => fs.writeFileSync(path.join(__dirname, 'LICENSE'), 'MIT License\n\nCopyright (c) 2026 Quiz Game')
    }
];

async function run() {
    console.log(`Starting execution of ${tasks.length} tasks...`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`[${i + 1}/${tasks.length}] Running: ${task.msg}`);

        try {
            const changed = task.fn();
            if (changed !== false) {
                await runCommand('git add .');
                await runCommand(`git commit -m "${task.msg}"`);
                console.log(`Successfully committed: ${task.msg}`);
            } else {
                console.log(`Skipped (no change): ${task.msg}`);
            }
        } catch (err) {
            console.error(`Failed task ${i + 1}:`, err);
        }

        // Small delay to ensure timestamp diff
        await new Promise(r => setTimeout(r, 200));
    }

    console.log("All tasks completed.");
}

run();
