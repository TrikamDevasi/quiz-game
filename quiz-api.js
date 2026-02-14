const axios = require('axios'); // HTTP client

/**
 * Service to interaction with Open Trivia DB
 */
class QuizAPIService {
    constructor() {
        this.baseURL = 'https://opentdb.com';
        this.apiEndpoint = `${this.baseURL}/api.php`;
    }

    /**
     * Fetches questions from Open Trivia Database API
     * @param {Object} options - Configuration options
     * @param {number} options.amount - Number of questions to fetch (default: 10)
     * @param {string} options.category - Category ID (default: any)
     * @param {string} options.difficulty - Difficulty level (easy, medium, hard)
     * @param {string} options.type - Question type (multiple choice, boolean)
     * @returns {Promise<Array>} Array of formatted questions
     */
    async fetchQuestions(options = {}) {
        try {
            const {
                amount = 10,
                category,
                difficulty,
                type = 'multiple'
            } = options;

            const params = {
                amount,
                type
            };

            if (category) params.category = category;
            if (difficulty) params.difficulty = difficulty;

            console.info(`[API] Fetching ${amount} questions from Open Trivia DB...`);

            const response = await axios.get(this.apiEndpoint, { params });

            if (response.data.response_code !== 0) {
                throw new Error(`API Error: ${this.getErrorMessage(response.data.response_code)}`);
            }

            const questions = response.data.results.map(this.formatQuestion.bind(this));
            console.log(`Successfully fetched ${questions.length} questions`);

            return questions;
        } catch (error) {
            console.error('Error fetching questions from API:', error.message);
            throw error;
        }
    }

    /**
     * Formats question from API response to match our internal format
     * @param {Object} apiQuestion - Raw question from API
     * @returns {Object} Formatted question object
     */
    formatQuestion(apiQuestion) {
        // Decode HTML entities in question and answers
        const decodeHTML = (text) => {
            const entities = {
                '&quot;': '"',
                '&#039;': "'",
                '&lt;': '<',
                '&gt;': '>',
                '&amp;': '&'
            };
            return text.replace(/&[a-z]+;|&#[0-9]+;/g, (entity) => entities[entity] || entity);
        };

        const question = decodeHTML(apiQuestion.question);
        const correctAnswer = decodeHTML(apiQuestion.correct_answer);
        const incorrectAnswers = apiQuestion.incorrect_answers.map(ans => decodeHTML(ans));

        // Combine correct and incorrect answers, then shuffle
        const allOptions = [...incorrectAnswers, correctAnswer];
        const shuffledOptions = this.shuffleArray(allOptions);

        // Find the index of the correct answer in the shuffled array
        const correctIndex = shuffledOptions.findIndex(option => option === correctAnswer);

        // Map API difficulty to our format
        const difficultyMap = {
            'easy': 'easy',
            'medium': 'medium',
            'hard': 'hard'
        };

        return {
            question,
            options: shuffledOptions,
            correct: correctIndex,
            difficulty: difficultyMap[apiQuestion.difficulty] || 'medium'
        };
    }

    /**
     * Shuffles an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Gets error message from API response code
     * @param {number} code - API response code
     * @returns {string} Error message
     */
    getErrorMessage(code) {
        const messages = {
            1: 'Not enough questions available for the specified parameters',
            2: 'Invalid parameter',
            3: 'Token not found',
            4: 'Token empty'
        };
        return messages[code] || 'Unknown error';
    }

    /**
     * Gets available categories from the API
     * @returns {Promise<Array>} Array of category objects
     */
    async getCategories() {
        try {
            const response = await axios.get(`${this.baseURL}/api_category.php`);
            return response.data.trivia_categories || [];
        } catch (error) {
            console.error('Error fetching categories:', error.message);
            return [];
        }
    }

    /**
     * Maps our category names to Open Trivia DB category IDs
     * @param {string} categoryName - Our internal category name
     * @returns {number|null} Open Trivia DB category ID
     */
    mapCategoryToID(categoryName) {
        const categoryMap = {
            'bollywood': null, // Not available in Open Trivia DB
            'cricket': null,   // Not available in Open Trivia DB
            'indian_history': 23, // History category
            'indian_culture': null, // Not specifically available
            'general_knowledge': 9, // General Knowledge
            'technology': 18, // Computers/Science
            'random': null // Use null for random/mixed categories
        };

        return categoryMap[categoryName] || null;
    }

    /**
     * Fetches questions with category mapping
     * @param {string} categoryName - Our internal category name
     * @param {number} amount - Number of questions
     * @param {string} difficulty - Difficulty level
     * @returns {Promise<Array>} Array of formatted questions
     */
    async fetchQuestionsByCategory(categoryName, amount = 10, difficulty) {
        const categoryId = this.mapCategoryToID(categoryName);

        if (categoryName === 'random') {
            // For random, fetch from multiple categories
            return this.fetchRandomQuestions(amount, difficulty);
        }

        if (!categoryId && categoryName !== 'random') {
            throw new Error(`Category '${categoryName}' is not available in Open Trivia Database`);
        }

        return this.fetchQuestions({
            amount,
            category: categoryId,
            difficulty
        });
    }

    /**
     * Fetches random questions from multiple categories
     * @param {number} amount - Total number of questions
     * @param {string} difficulty - Difficulty level
     * @returns {Promise<Array>} Array of formatted questions
     */
    async fetchRandomQuestions(amount = 10, difficulty) {
        try {
            // Fetch from multiple categories to get variety
            const categories = [9, 18, 23, 21, 22]; // General Knowledge, Computers, History, Sports, Geography
            const questionsPerCategory = Math.ceil(amount / categories.length);

            const allQuestions = [];

            for (const categoryId of categories) {
                try {
                    const questions = await this.fetchQuestions({
                        amount: Math.min(questionsPerCategory, amount - allQuestions.length),
                        category: categoryId,
                        difficulty
                    });
                    allQuestions.push(...questions);

                    if (allQuestions.length >= amount) break;
                } catch (error) {
                    console.warn(`Failed to fetch from category ${categoryId}:`, error.message);
                }
            }

            // If we still need more questions, fetch from any category
            if (allQuestions.length < amount) {
                const remaining = amount - allQuestions.length;
                try {
                    const moreQuestions = await this.fetchQuestions({
                        amount: remaining,
                        difficulty
                    });
                    allQuestions.push(...moreQuestions);
                } catch (error) {
                    console.warn('Failed to fetch additional questions:', error.message);
                }
            }

            // Shuffle and return the requested amount
            return this.shuffleArray(allQuestions).slice(0, amount);
        } catch (error) {
            console.error('Error fetching random questions:', error.message);
            throw error;
        }
    }
}

module.exports = new QuizAPIService();
