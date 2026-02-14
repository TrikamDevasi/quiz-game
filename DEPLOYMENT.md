# Quiz Multiplayer - Ultimate Upgrade

## 🚀 Deployment & Running

### Prerequisites
- Node.js (v14+ recommended)
- NPM

### Installation
1. Navigate to the project directory:
   ```bash
   cd quiz-multiplayer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
   *(Note: The project uses standard built-in modules mostly, but ensures `express` and `ws` are installed)*

### Running the Server
Start the modular server:
```bash
node server.js
```
The server will start on port 3000 (default).
Access the game at: `http://localhost:3000`

## 🏗️ Project Structure
- **server.js**: Entry point. Initializes Express and WebSocket server.
- **utils/**:
  - **gameEngine.js**: Core game logic (questions, scoring, lifelines).
  - **roomManager.js**: Manages rooms and players.
  - **socketHandler.js**: Handles WebSocket events and routing.
- **public/**:
  - **index.html**: Main UI.
  - **style.css**: Premium styles with glassmorphism.
  - **js/**:
    - **GameClient.js**: Main client logic.
    - **UIManager.js**: DOM manipulation and UI state.
    - **AudioManager.js**: Sound effects management.

## 🌟 New Features
- **Modular Codebase**: Easier to maintain and extend.
- **Premium UI**: Dark mode, glassmorphism, animations.
- **Sound Effects**: Toggleable sound for interactions.
- **How to Play**: Built-in guide for new players.
- **Robustness**: Better error handling and fallback questions.

## ⚠️ Notes
- The application uses `questions.json` as a fallback if the external API fails.
- Ensure port 3000 is free before running.

## Prerequisites
- Node.js v14+
- NPM v6+