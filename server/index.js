const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { RoomManager } = require('./roomManager');
const { setupSocketHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const path = require('path');
// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

const roomManager = new RoomManager();

// REST endpoints
app.get('/api/rooms/public', (req, res) => {
  const publicRooms = roomManager.getPublicRooms();
  res.json(publicRooms);
});

app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    code: room.code,
    host: room.host.username,
    timeControl: room.settings.timeControl,
    increment: room.settings.increment,
    gameMode: room.settings.gameMode,
    visibility: room.settings.visibility,
    status: room.status,
    players: room.getPlayerCount(),
  });
});

// Socket.io
setupSocketHandlers(io, roomManager);

// Cleanup stale rooms every 5 minutes
setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 5 * 60 * 1000);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});
