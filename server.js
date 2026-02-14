// Import dependencies
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { handleConnection } = require('./utils/socketHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

wss.on('connection', (ws) => {
    handleConnection(ws);
});

server.listen(PORT, () => {
    console.log(`Quiz server running on port ${PORT}`);
});
