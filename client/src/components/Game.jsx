import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import sounds from '../sounds';
import Chessboard from './Chessboard';
import MinePlacement from './MinePlacement';
import GameOverModal from './GameOverModal';
import PlayerPanel from './PlayerPanel';
import MoveHistory from './MoveHistory';
import { PIECE_UNICODE } from '../pieces';

export default function Game({ username }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [explosionSquare, setExplosionSquare] = useState(null);
  const [drawOffer, setDrawOffer] = useState(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [myRematchSent, setMyRematchSent] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState(null);
  const [viewIndex, setViewIndex] = useState(-1);
  const viewIndexRef = useRef(-1); // Replaced viewIndex if needed, but not touching it
  const endSoundPlayedRef = useRef(false);
  const joinedRef = useRef(false);

  // History Navigation Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (!gameState || (gameState.status !== 'playing' && gameState.status !== 'finished')) return;
      if (gameState.moveHistory.length === 0) return;

      if (e.key === 'ArrowLeft') {
        setViewIndex((prev) => {
          const current = prev === -1 ? gameState.moveHistory.length : prev;
          return Math.max(0, current - 1);
        });
      } else if (e.key === 'ArrowRight') {
        setViewIndex((prev) => {
          if (prev === -1) return -1;
          const next = prev + 1;
          if (next >= gameState.moveHistory.length) return -1;
          return next;
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Handle game over sounds
  useEffect(() => {
    if (!gameState) return;
    
    if (gameState.status !== 'finished') {
      endSoundPlayedRef.current = false;
      return;
    }

    if (gameState.status === 'finished' && !endSoundPlayedRef.current) {
      endSoundPlayedRef.current = true;
      const { spectator, myColor, result } = gameState;
      if (spectator) {
        sounds.gameEnd();
      } else if (result?.winner) {
        if (result.winner === myColor) {
          sounds.win();
        } else {
          sounds.lose();
        }
      } else {
        sounds.draw();
      }
    }
  }, [gameState?.status, gameState?.result]);

  // Join or reconnect to the room
  useEffect(() => {
    if (!code || joinedRef.current) return;
    joinedRef.current = true;

    if (!socket.connected) {
      socket.connect();
    }

    // Try joining first
    socket.emit('join_room', { code: code.toUpperCase(), username }, (response) => {
      if (response.error) {
        // Maybe already in the room or game started, try reconnect
        socket.emit('reconnect_room', { code: code.toUpperCase(), username }, (reconResp) => {
          if (reconResp.error) {
            // Try spectating
            socket.emit('spectate_room', { code: code.toUpperCase(), username }, (specResp) => {
              if (specResp.error) {
                setError(specResp.error);
              }
              setConnecting(false);
            });
          } else {
            setConnecting(false);
          }
        });
      } else {
        setConnecting(false);
      }
    });
  }, [code, username]);

  // Socket listeners
  useEffect(() => {
    function onYourState(state) {
      if (state.status === 'playing' || state.status === 'mine_placement') {
        sounds.stopAll();
      }
      setGameState(state);
      setConnecting(false);
    }

    function onMoveMade(data) {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fen: data.fen,
          turn: data.turn,
          isCheck: data.isCheck,
          clocks: data.clocks,
          moveHistory: [...prev.moveHistory, {
            from: data.move.from,
            to: data.move.to,
            san: data.move.san,
            color: data.move.color,
          }],
        };
      });

      if (data.mineExploded) {
        setExplosionSquare(data.mineExploded.square);
        sounds.explosion();
        setTimeout(() => setExplosionSquare(null), 800);
      } else if (!data.gameOver) {
        if (data.isCheck) {
          sounds.check();
        } else if (data.move.captured === 'q') {
          sounds.captureQueen();
        } else if (data.move.captured) {
          sounds.capture();
        } else {
          sounds.move();
        }
      }
    }

    function onClockUpdate(data) {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, clocks: data.clocks, turn: data.turn };
      });
    }

    function onGameOver(result) {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'finished', result };
      });
    }

    function onDrawOffered(data) {
      setDrawOffer(data.by);
      sounds.notify();
    }

    function onDrawDeclined() {
      setDrawOffer(null);
    }

    function onRematchRequested(data) {
      setRematchRequested(true);
      sounds.notify();
    }

    function onRematchStarted() {
      sounds.stopAll();
      setRematchRequested(false);
      setMyRematchSent(false);
      setDrawOffer(null);
      setExplosionSquare(null);
    }

    function onPlayerDisconnected(data) {
      setDisconnectedPlayer(data);
    }

    function onPlayerReconnected(data) {
      setDisconnectedPlayer(null);
    }

    function onGameStarted() {
      sounds.stopAll();
      sounds.notify();
    }

    function onOpponentMinesPlaced() {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, opponentMinesPlaced: true };
      });
    }

    socket.on('your_state', onYourState);
    socket.on('move_made', onMoveMade);
    socket.on('clock_update', onClockUpdate);
    socket.on('game_over', onGameOver);
    socket.on('draw_offered', onDrawOffered);
    socket.on('draw_declined', onDrawDeclined);
    socket.on('rematch_requested', onRematchRequested);
    socket.on('rematch_started', onRematchStarted);
    socket.on('player_disconnected', onPlayerDisconnected);
    socket.on('player_reconnected', onPlayerReconnected);
    socket.on('game_started', onGameStarted);
    socket.on('opponent_mines_placed', onOpponentMinesPlaced);

    return () => {
      sounds.stopAll();
      socket.off('your_state', onYourState);
      socket.off('move_made', onMoveMade);
      socket.off('clock_update', onClockUpdate);
      socket.off('game_over', onGameOver);
      socket.off('draw_offered', onDrawOffered);
      socket.off('draw_declined', onDrawDeclined);
      socket.off('rematch_requested', onRematchRequested);
      socket.off('rematch_started', onRematchStarted);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('player_reconnected', onPlayerReconnected);
      socket.off('game_started', onGameStarted);
      socket.off('opponent_mines_placed', onOpponentMinesPlaced);
    };
  }, []);

  const handleMove = useCallback((from, to, promotion) => {
    if (!gameState || gameState.status !== 'playing') return;
    socket.emit('make_move', {
      code: code.toUpperCase(),
      from, to, promotion,
    }, (response) => {
      if (response.error) {
        console.error('Move error:', response.error);
      }
    });
  }, [gameState, code]);

  const handlePlaceMines = useCallback((squares) => {
    socket.emit('place_mines', {
      code: code.toUpperCase(),
      squares,
    }, (response) => {
      if (response.error) {
        setError(response.error);
        setTimeout(() => setError(''), 3000);
      }
    });
  }, [code]);

  function handleResign() {
    if (window.confirm('Are you sure you want to resign?')) {
      socket.emit('resign', { code: code.toUpperCase() }, () => {});
    }
  }

  function handleOfferDraw() {
    socket.emit('offer_draw', { code: code.toUpperCase() }, () => {});
  }

  function handleAcceptDraw() {
    socket.emit('accept_draw', { code: code.toUpperCase() }, () => {});
    setDrawOffer(null);
  }

  function handleDeclineDraw() {
    socket.emit('decline_draw', { code: code.toUpperCase() }, () => {});
    setDrawOffer(null);
  }

  function handleRematch() {
    setMyRematchSent(true);
    socket.emit('request_rematch', { code: code.toUpperCase() }, () => {});
  }

  function handleAcceptRematch() {
    socket.emit('request_rematch', { code: code.toUpperCase() }, () => {});
    setRematchRequested(false);
  }

  // Loading state
  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4"
               style={{ animation: 'spin-slow 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Connecting to game...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-fade-in glass rounded-2xl p-8 max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const isSpectator = gameState.spectator;
  const myColor = gameState.myColor;
  const isFlipped = myColor === 'b';

  const isViewingHistory = viewIndex !== -1 && viewIndex < gameState.moveHistory.length;
  let displayedFen = gameState.fen;
  let displayedTurn = gameState.turn;
  let displayedLastMove = gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null;

  if (isViewingHistory) {
    if (viewIndex === 0) {
      displayedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      displayedTurn = 'w';
      displayedLastMove = null;
    } else {
      const historicalMove = gameState.moveHistory[viewIndex - 1];
      displayedFen = historicalMove.fen;
      displayedTurn = historicalMove.color === 'w' ? 'b' : 'w';
      displayedLastMove = historicalMove;
    }
  }

  // Mine placement phase
  if (gameState.status === 'mine_placement' && !isSpectator && !gameState.myMinesPlaced) {
    return (
      <div className="min-h-screen p-4"
           style={{ background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)' }}>
        <MinePlacement
          myColor={myColor}
          fen={gameState.fen}
          onPlaceMines={handlePlaceMines}
          error={error}
        />
      </div>
    );
  }

  // Waiting for opponent to place mines
  if (gameState.status === 'mine_placement' && gameState.myMinesPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-fade-in glass rounded-2xl p-8 max-w-md">
          <div className="text-4xl mb-4 animate-float">💣</div>
          <h2 className="text-xl font-bold mb-2">Mines Placed!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {gameState.opponentMinesPlaced
              ? 'Starting game...'
              : 'Waiting for opponent to place mines...'}
          </p>
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mt-4"
               style={{ animation: 'spin-slow 1s linear infinite' }}></div>
        </div>
      </div>
    );
  }

  // Determine opponent and self info
  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topPlayer = gameState.players[topColor];
  const bottomPlayer = gameState.players[bottomColor];

  return (
    <div className="min-h-screen p-2 md:p-4"
         style={{ background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)' }}>

      {/* Disconnection banner */}
      {disconnectedPlayer && (
        <div className="max-w-4xl mx-auto mb-2 p-3 rounded-lg text-center text-sm animate-shake"
             style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}>
          ⚠️ {disconnectedPlayer.username} disconnected. Auto-forfeit in 60s if they don't return.
        </div>
      )}

      {/* Draw offer banner */}
      {drawOffer && drawOffer !== myColor && (
        <div className="max-w-4xl mx-auto mb-2 p-3 rounded-lg text-center text-sm animate-fade-in flex items-center justify-center gap-3"
             style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <span>🤝 Opponent offers a draw</span>
          <button onClick={handleAcceptDraw} className="btn-success text-xs py-1 px-3">Accept</button>
          <button onClick={handleDeclineDraw} className="btn-danger text-xs py-1 px-3">Decline</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto mb-2 p-2 rounded-lg text-center text-xs"
             style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
        {/* Left side: Board */}
        <div className="flex-1 w-full max-w-[min(85vh,600px)] mx-auto lg:mx-0">
          {/* Top player */}
          <PlayerPanel
            username={topPlayer.username || (topColor === 'w' ? 'White' : 'Black')}
            color={topColor}
            clock={gameState.clocks[topColor]}
            isActive={gameState.turn === topColor && gameState.status === 'playing'}
            connected={topPlayer.connected}
            capturedPieces={gameState.capturedPieces[topColor === 'w' ? 'b' : 'w']}
          />

          {/* Board */}
          <Chessboard
            fen={displayedFen}
            myColor={isSpectator ? 'w' : myColor}
            isFlipped={isFlipped}
            isMyTurn={!isSpectator && !isViewingHistory && gameState.turn === myColor && gameState.status === 'playing'}
            onMove={handleMove}
            lastMove={displayedLastMove}
            isCheck={!isViewingHistory && gameState.isCheck}
            turn={displayedTurn}
            myMines={gameState.myMines || []}
            explodedSquares={gameState.explodedSquares || []}
            explosionSquare={!isViewingHistory ? explosionSquare : null}
            isSpectator={isSpectator}
            gameStatus={gameState.status}
          />

          {/* Bottom player */}
          <PlayerPanel
            username={bottomPlayer.username || (bottomColor === 'w' ? 'White' : 'Black')}
            color={bottomColor}
            clock={gameState.clocks[bottomColor]}
            isActive={gameState.turn === bottomColor && gameState.status === 'playing'}
            connected={bottomPlayer.connected}
            capturedPieces={gameState.capturedPieces[bottomColor === 'w' ? 'b' : 'w']}
          />
        </div>

        {/* Right side: Move history + controls */}
        <div className="w-full lg:w-72 flex flex-col gap-3">
          {/* Game info */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {gameState.settings.gameMode === 'landmine' ? '💣 Landmine Chess' : '♟️ Normal Chess'}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {gameState.settings.timeControl}+{gameState.settings.increment}
              </span>
            </div>
            {isSpectator && (
              <div className="text-xs text-center py-1 px-2 rounded-md mb-2"
                   style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)' }}>
                👁️ Spectating
              </div>
            )}
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Room: <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>{code?.toUpperCase()}</span>
            </div>
          </div>

          {/* Move history */}
          <div className="glass rounded-xl p-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                📝 Moves
              </h3>
              {isViewingHistory && (
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}>
                  Viewing Move {viewIndex}
                </span>
              )}
            </div>
            <MoveHistory moves={gameState.moveHistory} />
          </div>

          {/* Controls */}
          {!isSpectator && gameState.status === 'playing' && (
            <div className="glass rounded-xl p-4 flex gap-2">
              <button onClick={handleOfferDraw} className="btn-secondary flex-1 text-xs py-2">
                🤝 Draw
              </button>
              <button onClick={handleResign} className="btn-danger flex-1 text-xs py-2">
                🏳️ Resign
              </button>
            </div>
          )}

          {/* Back to home */}
          <button onClick={() => navigate('/')} className="btn-secondary w-full text-sm">
            ← Back to Lobby
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameState.status === 'finished' && gameState.result && (
        <GameOverModal
          result={gameState.result}
          myColor={myColor}
          isSpectator={isSpectator}
          players={gameState.players}
          onRematch={handleRematch}
          onAcceptRematch={handleAcceptRematch}
          onHome={() => navigate('/')}
          myRematchSent={myRematchSent}
          rematchRequested={rematchRequested}
        />
      )}
    </div>
  );
}
