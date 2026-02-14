const quizAPI = require('../quiz-api');

/**
 * Manages game logic, scoring, and questions
 */
class GameEngine {
    constructor() {
        this.userQuestionHistory = new Map();

        // Clean up old user histories every hour (prevent memory leaks)
        setInterval(() => {
            const maxHistorySize = 1000; // Keep max 1000 users
            if (this.userQuestionHistory.size > maxHistorySize) {
                console.log(`Cleaning up old question histories. Current size: ${this.userQuestionHistory.size}`);
                const entries = Array.from(this.userQuestionHistory.entries());
                // Keep only the most recent 500
                this.userQuestionHistory.clear();
                entries.slice(-500).forEach(([key, value]) => {
                    this.userQuestionHistory.set(key, value);
                });
                console.log(`Cleaned up. New size: ${this.userQuestionHistory.size}`);
            }
        }, 3600000); // Every hour
    }

    generateUserId() {
        return Math.random().toString(36).substring(2, 15);
    }

    async getUniqueQuestions(userId, category, count) {
        try {
            // Get questions from external API
            let questions;

            if (category === 'random') {
                questions = await quizAPI.fetchRandomQuestions(count);
            } else {
                questions = await quizAPI.fetchQuestionsByCategory(category, count);
            }

            if (!questions || questions.length === 0) {
                throw new Error('No questions received from API');
            }

            // Apply additional shuffling to ensure variety
            questions = questions.sort(() => 0.5 - Math.random());

            // Ensure we don't exceed the requested count
            questions = questions.slice(0, count);

            return questions;
        } catch (error) {
            console.error(`Error fetching questions for user ${userId}:`, error.message);

            // Fallback to local questions if API fails
            console.log('Falling back to local questions...');
            return this.getFallbackQuestions(category, count);
        }
    }

    async getFallbackQuestions(category, count) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const data = await fs.readFile(path.join(__dirname, '../questions.json'), 'utf8');

            let allQuestions = JSON.parse(data);
            let questions = [];

            if (category !== 'random' && category && allQuestions[category]) {
                questions = allQuestions[category];
            } else {
                // Combine all categories
                Object.values(allQuestions).forEach(categoryQuestions => {
                    questions = questions.concat(categoryQuestions);
                });
            }

            // Shuffle questions
            questions = questions.sort(() => 0.5 - Math.random());

            // Limit to requested count
            questions = questions.slice(0, Math.min(count, questions.length));

            // Shuffle options for each question
            return questions.map(q => {
                // Create a copy to avoid modifying the original mocked data if it were cached
                const questionCopy = { ...q };

                // Get the correct answer string
                const correctAnswer = questionCopy.options[questionCopy.correct];

                // Shuffle options
                const shuffledOptions = [...questionCopy.options].sort(() => 0.5 - Math.random());

                // Find new index of correct answer
                const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);

                questionCopy.options = shuffledOptions;
                questionCopy.correct = newCorrectIndex;

                return questionCopy;
            });

        } catch (error) {
            console.error('Error reading local questions file:', error);
            // Super fallback
            return [
                {
                    question: "What is the capital of India?",
                    options: ["New Delhi", "Mumbai", "Kolkata", "Chennai"],
                    correct: 0,
                    difficulty: "easy"
                }
            ];
        }
    }

    async startQuiz(room) {
        // We'll assume the host's userId is sufficient for history tracking for now, 
        // or we could track per player. The original code used ws.userId.
        // For now, let's use the host's userId if available, or just a random one.
        const hostUserId = room.host.userId || 'system';

        try {
            const questions = await this.getUniqueQuestions(
                hostUserId,
                room.settings.category,
                room.settings.questionCount
            );

            room.questions = questions;
            room.currentQuestion = 0;

            room.players.forEach(player => {
                player.lifelines = {
                    fiftyFifty: true,
                    audiencePoll: true,
                    skipQuestion: true
                };
            });

            return true;
        } catch (error) {
            console.error('Failed to start quiz:', error);
            return false;
        }
    }

    sendQuestion(room) {
        if (room.currentQuestion >= room.questions.length) {
            this.endQuiz(room);
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

    submitAnswer(room, ws, data) {
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
                this.sendQuestion(room);
            }, 3000);
        }
    }

    useLifeline(room, ws, data) {
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
                setTimeout(() => this.sendQuestion(room), 1000);
            }
        }
    }

    endQuiz(room) {
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
}

module.exports = new GameEngine();
