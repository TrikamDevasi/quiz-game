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

const tasks = [
    {
        msg: "style(css): doc container class",
        fn: () => replaceInFile('public/style.css', '.container {', "/* Main Container */\n.container {")
    },
    {
        msg: "style(css): doc button class",
        fn: () => replaceInFile('public/style.css', '.btn {', "/* Button Base Styles */\n.btn {")
    },
    {
        msg: "style(css): doc input styling",
        fn: () => replaceInFile('public/style.css', 'input {', "/* Form Inputs */\ninput {")
    },
    {
        msg: "style(css): doc util classes",
        fn: () => replaceInFile('public/style.css', '.hidden {', "/* Utilities */\n.hidden {")
    },
    {
        msg: "docs(gameEngine): comment history map",
        fn: () => replaceInFile('utils/gameEngine.js', 'this.userQuestionHistory = new Map();', 'this.userQuestionHistory = new Map(); // Tracks user questions')
    },
    {
        msg: lifeline = "docs(gameEngine): comment id generation",
        fn: () => replaceInFile('utils/gameEngine.js', 'generateUserId() {', '/** Generate ID */\n    generateUserId() {')
    },
    {
        msg: "docs(gameEngine): comment unique questions",
        fn: () => replaceInFile('utils/gameEngine.js', 'async getUniqueQuestions(userId, category, count) {', '// Fetch unique questions for user\n    async getUniqueQuestions(userId, category, count) {')
    },
    {
        msg: "docs(gameEngine): comment error handling",
        fn: () => replaceInFile('utils/gameEngine.js', "console.error('Failed to start quiz:', error);", "console.error('Failed to start quiz:', error); // Log critical failure")
    },
    {
        msg: "docs(gameEngine): comment send question",
        fn: () => replaceInFile('utils/gameEngine.js', 'sendQuestion(room) {', '/** Send next question to players */\n    sendQuestion(room) {')
    },
    {
        msg: "docs(gameEngine): comment submit answer",
        fn: () => replaceInFile('utils/gameEngine.js', 'submitAnswer(room, ws, data) {', '/** Handle answer submission */\n    submitAnswer(room, ws, data) {')
    },
    {
        msg: "docs(gameEngine): comment lifeline logic",
        fn: () => replaceInFile('utils/gameEngine.js', 'useLifeline(room, ws, data) {', '/** Handle lifeline usage */\n    useLifeline(room, ws, data) {')
    },
    {
        msg: "docs(gameEngine): comment end quiz",
        fn: () => replaceInFile('utils/gameEngine.js', 'endQuiz(room) {', '/** End quiz and calculate results */\n    endQuiz(room) {')
    },
    {
        msg: "chore(html): clean title",
        fn: () => replaceInFile('public/index.html', '<title>Quiz Multiplayer - KBC Style</title>', '<title>Quiz Multiplayer - KBC Edition</title>')
    },
    {
        msg: "chore(npm): update description",
        fn: () => replaceInFile('package.json', '"description": "KBC-style multiplayer quiz game"', '"description": "Real-time multiplayer knowledge test with KBC style"')
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

        await new Promise(r => setTimeout(r, 200));
    }

    console.log("All tasks completed.");
}

run();
