const { Chess } = require('chess.js');
const ChessAI = require('./ai');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class Room {
  constructor(code, hostSocket, hostUsername, settings) {
    this.code = code;
    this.settings = settings;
    this.status = 'waiting'; // waiting, mine_placement, playing, finished
    this.host = {
      socketId: hostSocket,
      username: hostUsername,
      userId: settings.playerId, // Persistent ID
      color: null,
      connected: true,
      disconnectedAt: null,
    };
    this.guest = null;
    this.spectators = [];
    this.chess = new Chess();
    this.moveHistory = [];
    this.capturedPieces = { w: [], b: [] };

    // Clocks (in milliseconds)
    this.clocks = {
      w: settings.timeControl * 60 * 1000,
      b: settings.timeControl * 60 * 1000,
    };
    this.clockInterval = null;
    this.lastTickTime = null;

    // Landmine data
    this.mines = { w: [], b: [] };
    this.minesPlaced = { w: false, b: false };
    this.explodedSquares = [];

    // Draw / Rematch
    this.drawOffer = null;
    this.rematchRequests = { w: false, b: false };

    // Result
    this.result = null;

    this.createdAt = Date.now();

    // Bot properties
    this.isBotGame = settings.opponentType === 'bot';
    this.botDifficulty = parseInt(settings.difficulty) || 1;
    this.ai = this.isBotGame ? new ChessAI(this.botDifficulty, settings.gameMode === 'landmine') : null;

    // Assign colors
    this._assignColors();
  }

  _assignColors() {
    const pref = this.settings.pieceColor;
    if (pref === 'white') {
      this.host.color = 'w';
    } else if (pref === 'black') {
      this.host.color = 'b';
    } else {
      this.host.color = Math.random() < 0.5 ? 'w' : 'b';
    }
  }

  addGuest(socketId, username, userId = null) {
    const color = this.host.color === 'w' ? 'b' : 'w';
    this.guest = {
      socketId,
      username,
      userId, // Persistent ID
      color,
      connected: true,
      disconnectedAt: null,
    };

    if (this.settings.gameMode === 'landmine') {
      this.status = 'mine_placement';
    } else {
      this.status = 'playing';
      this.startClock();
    }

    // If it's a bot game, the bot might need to place mines or move
    if (this.isBotGame) {
      this._checkBotTurn();
    }
  }

  _checkBotTurn() {
    if (this.status === 'mine_placement' && !this.minesPlaced[this.guest.color]) {
      // Bot places mines automatically
      setTimeout(() => {
        const botMines = ChessAI.getRandomMines(this.guest.color);
        this.placeMines('BOT_SOCKET_ID', botMines);
      }, 1000);
    } else if (this.status === 'playing' && this.chess.turn() === this.guest.color) {
      // Bot makes a move after a "thinking" delay
      const delay = Math.max(500, Math.min(2000, 500 + Math.random() * 1500));
      setTimeout(async () => {
        if (this.status !== 'playing' || this.chess.turn() !== this.guest.color) return;
        
        const move = await this.ai.getBestMove(this.chess, this.mines);
        if (move) {
          this._botRequestMove(move);
        }
      }, delay);
    }
  }

  _botRequestMove(move) {
    if (this.onBotMove) {
      this.onBotMove(move);
    }
  }

  getPlayerBySocket(socketId) {
    if (this.host && this.host.socketId === socketId) return this.host;
    if (this.guest && this.guest.socketId === socketId) return this.guest;
    return null;
  }

  getPlayerByColor(color) {
    if (this.host && this.host.color === color) return this.host;
    if (this.guest && this.guest.color === color) return this.guest;
    return null;
  }

  getOpponent(socketId) {
    if (this.host && this.host.socketId === socketId) return this.guest;
    if (this.guest && this.guest.socketId === socketId) return this.host;
    return null;
  }

  getPlayerCount() {
    let count = 1;
    if (this.guest) count = 2;
    return count;
  }

  isPlayer(socketId) {
    return (
      (this.host && this.host.socketId === socketId) ||
      (this.guest && this.guest.socketId === socketId)
    );
  }

  addSpectator(socketId, username) {
    this.spectators.push({ socketId, username });
  }

  removeSpectator(socketId) {
    this.spectators = this.spectators.filter((s) => s.socketId !== socketId);
  }

  // ---- Mine Placement ----
  placeMines(socketId, squares) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return { error: 'Not a player' };
    if (this.minesPlaced[player.color]) return { error: 'Already placed' };

    const color = player.color;

    // Validate squares
    if (!Array.isArray(squares) || squares.length !== 3) {
      return { error: 'Must place exactly 3 mines' };
    }

    const validRows = color === 'w' ? ['3', '4'] : ['5', '6'];

    for (const sq of squares) {
      if (typeof sq !== 'string' || sq.length !== 2) {
        return { error: `Invalid square: ${sq}` };
      }
      const row = sq[1];
      if (!validRows.includes(row)) {
        return { error: `Square ${sq} is not in your allowed rows (${validRows.join(', ')})` };
      }
      // Check square is empty at game start
      const piece = this.chess.get(sq);
      if (piece) {
        return { error: `Square ${sq} has a piece on it` };
      }
    }

    // Check for duplicates
    const unique = new Set(squares);
    if (unique.size !== 3) {
      return { error: 'Duplicate mine squares' };
    }

    this.mines[color] = [...squares];
    this.minesPlaced[color] = true;

    // If both players placed, start the game
    if (this.minesPlaced.w && this.minesPlaced.b) {
      this.status = 'playing';
      this.startClock();
      if (this.isBotGame) this._checkBotTurn();
      return { started: true };
    }

    if (this.isBotGame) this._checkBotTurn();
    return { waiting: true };
  }

  // ---- Chess Moves ----
  makeMove(socketId, from, to, promotion) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return { error: 'Not a player' };
    if (this.status !== 'playing') return { error: 'Game not in progress' };
    if (this.chess.turn() !== player.color) return { error: 'Not your turn' };

    // Attempt the move
    let move;
    try {
      move = this.chess.move({ from, to, promotion: promotion || 'q' });
    } catch (e) {
      return { error: 'Invalid move' };
    }

    if (!move) return { error: 'Invalid move' };

    // Track captures
    if (move.captured) {
      this.capturedPieces[move.color === 'w' ? 'b' : 'w'].push({
        type: move.captured,
        color: move.color === 'w' ? 'b' : 'w',
      });
    }

    // Add increment to moving player's clock
    this.clocks[player.color] += this.settings.increment * 1000;

    // Switch clock
    this.lastTickTime = Date.now();

    // Check for landmine on target square
    let mineExploded = null;
    if (this.settings.gameMode === 'landmine') {
      mineExploded = this._checkMine(move.to, move.color);
    }

    this.moveHistory.push({
      from: move.from,
      to: move.to,
      san: move.san,
      color: move.color,
      flags: move.flags,
      fen: this.chess.fen(),
      mineExploded: mineExploded ? true : false,
    });

    // Check game end conditions
    let gameOver = null;
    if (mineExploded && move.piece === 'k') {
      gameOver = {
        reason: 'king_exploded',
        winner: move.color === 'w' ? 'b' : 'w',
      };
    } else if (this.chess.isCheckmate()) {
      gameOver = {
        reason: 'checkmate',
        winner: this.chess.turn() === 'w' ? 'b' : 'w',
      };
    } else if (this.chess.isStalemate()) {
      gameOver = { reason: 'stalemate', winner: null };
    } else if (this.chess.isDraw()) {
      let drawReason = 'draw';
      if (this.chess.isThreefoldRepetition()) drawReason = 'threefold_repetition';
      else if (this.chess.isInsufficientMaterial()) drawReason = 'insufficient_material';
      gameOver = { reason: drawReason, winner: null };
    }

    if (gameOver) {
      this.endGame(gameOver.reason, gameOver.winner);
    } else if (this.isBotGame) {
      this._checkBotTurn();
    }

    return {
      move,
      mineExploded,
      gameOver,
      fen: this.chess.fen(),
      clocks: { ...this.clocks },
    };
  }

  _checkMine(square, movingColor) {
    // Check both players' mines
    for (const mineColor of ['w', 'b']) {
      const idx = this.mines[mineColor].indexOf(square);
      if (idx !== -1) {
        // Mine found! Remove it
        this.mines[mineColor].splice(idx, 1);
        this.explodedSquares.push(square);

        // Remove the piece that just moved there
        this.chess.remove(square);

        return {
          square,
          mineOwner: mineColor,
          pieceDestroyed: movingColor,
        };
      }
    }
    return null;
  }

  // ---- Clock Management ----
  startClock() {
    this.lastTickTime = Date.now();
    this.clockInterval = setInterval(() => {
      this._tickClock();
    }, 100);
  }

  _tickClock() {
    if (this.status !== 'playing') {
      clearInterval(this.clockInterval);
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastTickTime;
    this.lastTickTime = now;

    const currentTurn = this.chess.turn();

    // Only tick if that player is connected
    const currentPlayer = this.getPlayerByColor(currentTurn);
    if (currentPlayer && !currentPlayer.connected) return;

    this.clocks[currentTurn] -= elapsed;

    if (this.clocks[currentTurn] <= 0) {
      this.clocks[currentTurn] = 0;
      const winner = currentTurn === 'w' ? 'b' : 'w';
      this.endGame('timeout', winner);
    }
  }

  pauseClocks() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  resumeClocks() {
    if (this.status === 'playing' && !this.clockInterval) {
      this.lastTickTime = Date.now();
      this.clockInterval = setInterval(() => {
        this._tickClock();
      }, 100);
    }
  }

  endGame(reason, winner) {
    this.status = 'finished';
    this.result = { reason, winner };
    this.pauseClocks();
    return this.result;
  }

  // ---- Draw / Resign / Rematch ----
  offerDraw(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return null;
    this.drawOffer = player.color;
    return player.color;
  }

  acceptDraw(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return null;
    if (this.drawOffer === player.color) return null; // Can't accept own offer
    return this.endGame('draw_agreement', null);
  }

  declineDraw(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return null;
    this.drawOffer = null;
    return true;
  }

  resign(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return null;
    const winner = player.color === 'w' ? 'b' : 'w';
    return this.endGame('resignation', winner);
  }

  requestRematch(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return null;
    this.rematchRequests[player.color] = true;
    if (this.rematchRequests.w && this.rematchRequests.b) {
      return { accepted: true };
    }
    return { requested: player.color };
  }

  resetForRematch() {
    // Swap colors
    const oldHostColor = this.host.color;
    this.host.color = this.guest.color;
    this.guest.color = oldHostColor;

    this.chess = new Chess();
    this.moveHistory = [];
    this.capturedPieces = { w: [], b: [] };
    this.clocks = {
      w: this.settings.timeControl * 60 * 1000,
      b: this.settings.timeControl * 60 * 1000,
    };
    this.mines = { w: [], b: [] };
    this.minesPlaced = { w: false, b: false };
    this.explodedSquares = [];
    this.drawOffer = null;
    this.rematchRequests = { w: false, b: false };
    this.result = null;

    if (this.settings.gameMode === 'landmine') {
      this.status = 'mine_placement';
    } else {
      this.status = 'playing';
      this.startClock();
    }
  }

  getState(forSocketId) {
    const player = this.getPlayerBySocket(forSocketId);
    const isPlayer = !!player;

    const state = {
      code: this.code,
      status: this.status,
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      moveHistory: this.moveHistory,
      capturedPieces: this.capturedPieces,
      clocks: { ...this.clocks },
      isCheck: this.chess.isCheck(),
      settings: this.settings,
      result: this.result,
      drawOffer: this.drawOffer,
      explodedSquares: this.explodedSquares,
      players: {
        w: {
          username: this.getPlayerByColor('w')?.username || '',
          connected: this.getPlayerByColor('w')?.connected ?? false,
        },
        b: {
          username: this.getPlayerByColor('b')?.username || '',
          connected: this.getPlayerByColor('b')?.connected ?? false,
        },
      },
    };

    if (isPlayer) {
      state.myColor = player.color;
      state.myMines = this.mines[player.color];
      state.myMinesPlaced = this.minesPlaced[player.color];
      state.opponentMinesPlaced =
        this.minesPlaced[player.color === 'w' ? 'b' : 'w'];
    } else {
      state.spectator = true;
    }

    return state;
  }

  cleanup() {
    this.pauseClocks();
    if (this.ai) {
      this.ai.cleanup();
    }
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
  }

  createRoom(socketId, username, playerId, settings) {
    let code;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const room = new Room(code, socketId, username, { ...settings, playerId });
    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);

    // If it's a bot game, add the guest immediately
    if (room.isBotGame) {
      room.addGuest('BOT_SOCKET_ID', 'Computer (Lv.' + room.botDifficulty + ')');
    }

    return room;
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase());
  }

  joinRoom(code, socketId, username, userId) {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };

    // Check if it's a returning player (refresh)
    if (room.host.userId === userId) {
      this.socketToRoom.delete(room.host.socketId);
      room.host.socketId = socketId;
      room.host.connected = true;
      this.socketToRoom.set(socketId, room.code);
      return { room, reconnected: true };
    }
    if (room.guest && room.guest.userId === userId) {
      this.socketToRoom.delete(room.guest.socketId);
      room.guest.socketId = socketId;
      room.guest.connected = true;
      this.socketToRoom.set(socketId, room.code);
      return { room, reconnected: true };
    }

    if (room.status !== 'waiting') return { error: 'Game already started' };
    if (room.guest) return { error: 'Room is full' };
    if (room.host.socketId === socketId) return { error: 'Cannot join your own room' };

    room.addGuest(socketId, username, userId);
    this.socketToRoom.set(socketId, room.code);
    return { room };
  }

  spectateRoom(code, socketId, username) {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };
    room.addSpectator(socketId, username);
    this.socketToRoom.set(socketId, room.code);
    return { room };
  }

  handleDisconnect(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    // Check if spectator
    const isSpectator = room.spectators.some((s) => s.socketId === socketId);
    if (isSpectator) {
      room.removeSpectator(socketId);
      this.socketToRoom.delete(socketId);
      return { room, type: 'spectator' };
    }

    // Player disconnected
    const player = room.getPlayerBySocket(socketId);
    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();

      if (room.status === 'playing') {
        room.pauseClocks();
      }

      return { room, type: 'player', player };
    }

    return null;
  }

  handleReconnect(socketId, code, username, userId) {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };

    // Find the disconnected player by userId or username
    let player = null;
    if (room.host && (room.host.userId === userId || room.host.username === username)) {
      player = room.host;
    } else if (room.guest && (room.guest.userId === userId || room.guest.username === username)) {
      player = room.guest;
    }

    if (!player) return { error: 'No disconnected player with that username' };

    // Update socket ID
    const oldSocketId = player.socketId;
    this.socketToRoom.delete(oldSocketId);

    player.socketId = socketId;
    player.connected = true;
    player.disconnectedAt = null;
    this.socketToRoom.set(socketId, room.code);

    // Resume clocks if both players connected
    const opponent = room.getOpponent(socketId);
    if (opponent && opponent.connected && room.status === 'playing') {
      room.resumeClocks();
    }

    return { room, player };
  }

  removeRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      room.cleanup();
      // Clean up socket mappings
      if (room.host) this.socketToRoom.delete(room.host.socketId);
      if (room.guest) this.socketToRoom.delete(room.guest.socketId);
      room.spectators.forEach((s) => this.socketToRoom.delete(s.socketId));
      this.rooms.delete(code);
    }
  }

  getPublicRooms() {
    const publicRooms = [];
    for (const [code, room] of this.rooms) {
      if (
        room.settings.visibility === 'public' &&
        room.status === 'waiting' &&
        !room.guest
      ) {
        publicRooms.push({
          code,
          host: room.host.username,
          timeControl: room.settings.timeControl,
          increment: room.settings.increment,
          gameMode: room.settings.gameMode,
        });
      }
    }
    return publicRooms;
  }

  cleanupStaleRooms() {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour
    for (const [code, room] of this.rooms) {
      if (
        room.status === 'finished' &&
        now - room.createdAt > staleThreshold
      ) {
        this.removeRoom(code);
      }
      // Remove waiting rooms older than 30 minutes
      if (
        room.status === 'waiting' &&
        now - room.createdAt > 30 * 60 * 1000
      ) {
        this.removeRoom(code);
      }
    }
  }
}

module.exports = { RoomManager, Room };
