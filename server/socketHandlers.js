const DISCONNECT_TIMEOUT = 60 * 1000; // 60 seconds

function setupSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // ---- Create Room ----
    socket.on('create_room', ({ username, settings }, callback) => {
      const room = roomManager.createRoom(socket.id, username, settings);
      socket.join(room.code);
      
      if (room.isBotGame) {
        // Set up bot move listener
        room.onBotMove = (move) => {
          handleMoveInternal(io, room, 'BOT_SOCKET_ID', move.from, move.to, move.promotion);
        };

        // Notify the host immediately since bot joined during room creation
        setTimeout(() => {
          socket.emit('opponent_joined', {
            username: room.guest.username,
            color: room.guest.color,
          });
          socket.emit('your_state', room.getState(socket.id));
          socket.emit('game_state', room.getState(null));
          
          if (room.status === 'playing') {
            socket.emit('game_started');
            startClockBroadcast(io, room);
          }
        }, 100);
      }

      callback({ code: room.code, color: room.host.color });
    });

    // ---- Join Room ----
    socket.on('join_room', ({ code, username }, callback) => {
      const result = roomManager.joinRoom(code, socket.id, username);
      if (result.error) {
        return callback({ error: result.error });
      }

      const room = result.room;
      socket.join(room.code);

      // Notify the host
      const hostSocket = room.host.socketId;
      io.to(hostSocket).emit('opponent_joined', {
        username,
        color: room.guest.color,
      });

      // Send game state to both players
      io.to(room.code).emit('game_state', room.getState(null));

      // Send individual states
      io.to(room.host.socketId).emit('your_state', room.getState(room.host.socketId));
      io.to(room.guest.socketId).emit('your_state', room.getState(room.guest.socketId));

      callback({ success: true, color: room.guest.color });

      // Start clock tick broadcast
      startClockBroadcast(io, room);
    });

    // ---- Spectate Room ----
    socket.on('spectate_room', ({ code, username }, callback) => {
      const result = roomManager.spectateRoom(code, socket.id, username || 'Spectator');
      if (result.error) {
        return callback({ error: result.error });
      }

      const room = result.room;
      socket.join(room.code);
      callback({ success: true });

      socket.emit('your_state', room.getState(socket.id));

      io.to(room.code).emit('spectator_count', room.spectators.length);
    });

    // ---- Reconnect ----
    socket.on('reconnect_room', ({ code, username }, callback) => {
      const result = roomManager.handleReconnect(socket.id, code, username);
      if (result.error) {
        return callback({ error: result.error });
      }

      const room = result.room;
      socket.join(room.code);

      io.to(room.code).emit('player_reconnected', {
        color: result.player.color,
        username: result.player.username,
      });

      socket.emit('your_state', room.getState(socket.id));
      callback({ success: true });
    });

    // ---- Place Mines ----
    socket.on('place_mines', ({ code, squares }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      const result = room.placeMines(socket.id, squares);
      if (result.error) return callback({ error: result.error });

      callback({ success: true });

      const player = room.getPlayerBySocket(socket.id);

      // Notify opponent that mines are placed (without revealing positions)
      const opponent = room.getOpponent(socket.id);
      if (opponent) {
        io.to(opponent.socketId).emit('opponent_mines_placed');
      }

      if (result.started) {
        // Both placed, game starts
        io.to(room.host.socketId).emit('your_state', room.getState(room.host.socketId));
        io.to(room.guest.socketId).emit('your_state', room.getState(room.guest.socketId));
        io.to(room.code).emit('game_started');
        startClockBroadcast(io, room);
      }
    });

    // ---- Make Move ----
    socket.on('make_move', ({ code, from, to, promotion }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      const result = handleMoveInternal(io, room, socket.id, from, to, promotion);
      if (result.error) return callback({ error: result.error });

      callback({ success: true });
    });

    function handleMoveInternal(io, room, socketId, from, to, promotion) {
      const result = room.makeMove(socketId, from, to, promotion);
      if (result.error) return result;

      // Broadcast to all in room
      io.to(room.code).emit('move_made', {
        move: result.move,
        fen: result.fen,
        clocks: result.clocks,
        mineExploded: result.mineExploded,
        isCheck: room.chess.isCheck(),
        turn: room.chess.turn(),
        gameOver: result.gameOver ? true : false,
      });

      // Send updated personal states (for mine visibility)
      if (room.host && room.host.connected) {
        io.to(room.host.socketId).emit('your_state', room.getState(room.host.socketId));
      }
      if (room.guest && room.guest.connected && room.guest.socketId !== 'BOT_SOCKET_ID') {
        io.to(room.guest.socketId).emit('your_state', room.getState(room.guest.socketId));
      }

      if (result.gameOver) {
        io.to(room.code).emit('game_over', result.gameOver);
      }

      return result;
    }

    // ---- Draw Offer ----
    socket.on('offer_draw', ({ code }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      const offeringColor = room.offerDraw(socket.id);
      if (!offeringColor) return callback({ error: 'Cannot offer draw' });

      callback({ success: true });

      const opponent = room.getOpponent(socket.id);
      if (opponent) {
        io.to(opponent.socketId).emit('draw_offered', { by: offeringColor });
      }
    });

    socket.on('accept_draw', ({ code }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      const result = room.acceptDraw(socket.id);
      if (!result) return callback({ error: 'No draw to accept' });

      callback({ success: true });
      io.to(room.code).emit('game_over', result);
    });

    socket.on('decline_draw', ({ code }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      room.declineDraw(socket.id);
      callback({ success: true });

      io.to(room.code).emit('draw_declined');
    });

    // ---- Resign ----
    socket.on('resign', ({ code }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      const result = room.resign(socket.id);
      if (!result) return callback({ error: 'Cannot resign' });

      callback({ success: true });
      io.to(room.code).emit('game_over', result);
    });

    // ---- Rematch ----
    socket.on('request_rematch', ({ code }, callback) => {
      const room = roomManager.getRoom(code);
      if (!room) return callback({ error: 'Room not found' });

      const result = room.requestRematch(socket.id);
      if (!result) return callback({ error: 'Cannot request rematch' });

      callback({ success: true });

      if (result.accepted) {
        room.resetForRematch();
        io.to(room.host.socketId).emit('your_state', room.getState(room.host.socketId));
        io.to(room.guest.socketId).emit('your_state', room.getState(room.guest.socketId));
        io.to(room.code).emit('rematch_started');

        if (room.status === 'playing') {
          startClockBroadcast(io, room);
        }
      } else {
        const opponent = room.getOpponent(socket.id);
        if (opponent) {
          io.to(opponent.socketId).emit('rematch_requested', {
            by: room.getPlayerBySocket(socket.id).color,
          });
        }
      }
    });

    // ---- Disconnect ----
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      const result = roomManager.handleDisconnect(socket.id);
      if (!result) return;

      const { room, type, player } = result;

      if (type === 'spectator') {
        io.to(room.code).emit('spectator_count', room.spectators.length);
        return;
      }

      if (type === 'player') {
        io.to(room.code).emit('player_disconnected', {
          color: player.color,
          username: player.username,
        });

        // Start disconnect timer
        setTimeout(() => {
          if (!player.connected && room.status === 'playing') {
            const winner = player.color === 'w' ? 'b' : 'w';
            const gameResult = room.endGame('abandonment', winner);
            io.to(room.code).emit('game_over', gameResult);
          }
        }, DISCONNECT_TIMEOUT);

        // If waiting room and host disconnects, destroy room
        if (room.status === 'waiting' && player === room.host) {
          setTimeout(() => {
            if (!player.connected) {
              roomManager.removeRoom(room.code);
            }
          }, 30000);
        }
      }
    });
  });
}

// Broadcast clocks periodically
const clockIntervals = new Map();

function startClockBroadcast(io, room) {
  // Clear existing broadcast if any
  if (clockIntervals.has(room.code)) {
    clearInterval(clockIntervals.get(room.code));
  }

  const interval = setInterval(() => {
    if (room.status !== 'playing') {
      clearInterval(interval);
      clockIntervals.delete(room.code);
      return;
    }

    io.to(room.code).emit('clock_update', {
      clocks: { ...room.clocks },
      turn: room.chess.turn(),
    });
  }, 500);

  clockIntervals.set(room.code, interval);
}

module.exports = { setupSocketHandlers };
