# 🚀 Quiz Multiplayer Deployment Guide

## Local Development

```bash
npm install
npm start
```

Visit: http://localhost:3000

## Deploy to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `TrikamDevasi/quiz-game`
4. Configure:
   - **Name**: quiz-multiplayer
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Click "Create Web Service"

## Environment Variables

No environment variables needed! The app works out of the box.

## Features

✅ 5 Categories (Tech, Entertainment, Sports, Science, History)
✅ 3 Lifelines (50:50, Audience Poll, Skip)
✅ Customizable Settings
✅ Real-time Multiplayer
✅ Scoring System
✅ Mobile Responsive
✅ Beautiful Animations

## How to Play

1. **Create Room** - Host creates room
2. **Share Code** - Friend joins with room code
3. **Configure** - Select category, questions, time
4. **Play** - Answer questions, use lifelines
5. **Win** - Highest score wins!

## Tech Stack

- **Backend**: Node.js + Express + WebSocket
- **Frontend**: Vanilla JavaScript + CSS
- **Database**: In-memory (questions.json)

## Repository

https://github.com/TrikamDevasi/quiz-game

---

**Made with ❤️ by Trikam**
