import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getPieceImage } from '../pieces';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function Chessboard({
  fen,
  myColor,
  isFlipped,
  isMyTurn,
  onMove,
  lastMove,
  isCheck,
  turn,
  myMines = [],
  explodedSquares = [],
  explosionSquare,
  isSpectator,
  gameStatus,
  premove,
  onSetPremove,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [promotionData, setPromotionData] = useState(null);

  // Parse FEN to get board state
  const chess = useMemo(() => {
    const c = new Chess();
    try { c.load(fen); } catch (e) { /* ignore */ }
    return c;
  }, [fen]);

  // Get board squares in display order
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;

  // Clear selection when FEN changes (a move was made)
  useEffect(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [fen]);

  // ---- Premove helpers ----

  // Get pseudo-legal target squares for a piece (ignoring check constraints)
  // Used during opponent's turn to allow premove selection
  function getPremoveTargets(square) {
    const piece = chess.get(square);
    if (!piece || piece.color !== myColor) return [];

    const targets = [];
    const file = FILES.indexOf(square[0]);
    const rank = parseInt(square[1]);

    // Helper to add square if on-board and not own piece
    function addIfValid(f, r) {
      if (f < 0 || f > 7 || r < 1 || r > 8) return;
      const sq = FILES[f] + r;
      const p = chess.get(sq);
      if (p && p.color === myColor) return; // can't capture own piece
      targets.push(sq);
    }

    switch (piece.type) {
      case 'p': {
        const dir = piece.color === 'w' ? 1 : -1;
        const startRank = piece.color === 'w' ? 2 : 7;
        // Forward
        addIfValid(file, rank + dir);
        // Double push from start
        if (rank === startRank) addIfValid(file, rank + 2 * dir);
        // Captures (diagonal)
        if (file > 0) addIfValid(file - 1, rank + dir);
        if (file < 7) addIfValid(file + 1, rank + dir);
        break;
      }
      case 'n': {
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [df, dr] of knightMoves) addIfValid(file + df, rank + dr);
        break;
      }
      case 'b': {
        for (const [df, dr] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
          for (let i = 1; i <= 7; i++) {
            const f = file + df * i, r = rank + dr * i;
            if (f < 0 || f > 7 || r < 1 || r > 8) break;
            const sq = FILES[f] + r;
            const p = chess.get(sq);
            targets.push(sq);
            if (p) break; // blocked
          }
        }
        // Remove own pieces
        return targets.filter(sq => { const p = chess.get(sq); return !p || p.color !== myColor; });
      }
      case 'r': {
        for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          for (let i = 1; i <= 7; i++) {
            const f = file + df * i, r = rank + dr * i;
            if (f < 0 || f > 7 || r < 1 || r > 8) break;
            const sq = FILES[f] + r;
            const p = chess.get(sq);
            targets.push(sq);
            if (p) break;
          }
        }
        return targets.filter(sq => { const p = chess.get(sq); return !p || p.color !== myColor; });
      }
      case 'q': {
        for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          for (let i = 1; i <= 7; i++) {
            const f = file + df * i, r = rank + dr * i;
            if (f < 0 || f > 7 || r < 1 || r > 8) break;
            const sq = FILES[f] + r;
            const p = chess.get(sq);
            targets.push(sq);
            if (p) break;
          }
        }
        return targets.filter(sq => { const p = chess.get(sq); return !p || p.color !== myColor; });
      }
      case 'k': {
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            addIfValid(file + df, rank + dr);
          }
        }
        // Castling (premove allows it optimistically)
        if (piece.color === 'w' && rank === 1) {
          addIfValid(file + 2, rank); // kingside
          addIfValid(file - 2, rank); // queenside
        } else if (piece.color === 'b' && rank === 8) {
          addIfValid(file + 2, rank);
          addIfValid(file - 2, rank);
        }
        break;
      }
    }

    return targets;
  }

  const handleSquareClick = useCallback((square) => {
    if (isSpectator || gameStatus !== 'playing') return;

    const piece = chess.get(square);

    // ---- Normal move (my turn) ----
    if (isMyTurn) {
      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        if (legalMoves.includes(square)) {
          const movingPiece = chess.get(selectedSquare);
          if (
            movingPiece &&
            movingPiece.type === 'p' &&
            ((movingPiece.color === 'w' && square[1] === '8') ||
             (movingPiece.color === 'b' && square[1] === '1'))
          ) {
            setPromotionData({ from: selectedSquare, to: square });
          } else {
            onMove(selectedSquare, square);
          }
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        if (piece && piece.color === myColor) {
          selectPiece(square);
          return;
        }

        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (piece && piece.color === myColor) {
        selectPiece(square);
      }
      return;
    }

    // ---- Premove (opponent's turn) ----
    // If clicking while a premove is already set, allow re-setting or clearing
    if (premove) {
      // Clicking on premove from/to clears it
      if (premove.from === square || premove.to === square) {
        onSetPremove(null);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        onSetPremove(null);
        return;
      }

      // Set premove if target is in pseudo-legal targets
      if (legalMoves.includes(square)) {
        const movingPiece = chess.get(selectedSquare);
        // For premove promotions, default to queen
        const isPromotion = movingPiece &&
          movingPiece.type === 'p' &&
          ((movingPiece.color === 'w' && square[1] === '8') ||
           (movingPiece.color === 'b' && square[1] === '1'));

        onSetPremove({
          from: selectedSquare,
          to: square,
          promotion: isPromotion ? 'q' : undefined,
        });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Click a different own piece — reselect for premove
      if (piece && piece.color === myColor) {
        selectPieceForPremove(square);
        return;
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Select own piece for premove
    if (piece && piece.color === myColor) {
      selectPieceForPremove(square);
      onSetPremove(null); // clear existing premove when selecting new piece
    }
  }, [selectedSquare, legalMoves, isMyTurn, myColor, chess, isSpectator, gameStatus, onMove, premove, onSetPremove]);

  function selectPiece(square) {
    setSelectedSquare(square);
    const moves = chess.moves({ square, verbose: true });
    setLegalMoves(moves.map((m) => m.to));
  }

  function selectPieceForPremove(square) {
    setSelectedSquare(square);
    const targets = getPremoveTargets(square);
    setLegalMoves(targets);
  }

  const handleDragStart = useCallback((e, square) => {
    if (isSpectator || gameStatus !== 'playing') {
      e.preventDefault();
      return;
    }
    const piece = chess.get(square);
    if (!piece || piece.color !== myColor) {
      e.preventDefault();
      return;
    }

    // Prevent drag during opponent's turn on mobile (touch-based)
    // but allow on desktop for premove drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', square);
    setDraggedSquare(square);

    if (isMyTurn) {
      selectPiece(square);
    } else {
      selectPieceForPremove(square);
    }
  }, [isMyTurn, isSpectator, gameStatus, chess, myColor]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Necessary to allow dropping
  }, []);

  const handleDrop = useCallback((e, targetSquare) => {
    e.preventDefault();
    if (!draggedSquare) return;

    if (isMyTurn) {
      // Normal move
      if (legalMoves.includes(targetSquare)) {
        const movingPiece = chess.get(draggedSquare);
        if (
          movingPiece &&
          movingPiece.type === 'p' &&
          ((movingPiece.color === 'w' && targetSquare[1] === '8') ||
           (movingPiece.color === 'b' && targetSquare[1] === '1'))
        ) {
          setPromotionData({ from: draggedSquare, to: targetSquare });
        } else {
          onMove(draggedSquare, targetSquare);
        }
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } else {
      // Premove via drag
      if (legalMoves.includes(targetSquare)) {
        const movingPiece = chess.get(draggedSquare);
        const isPromotion = movingPiece &&
          movingPiece.type === 'p' &&
          ((movingPiece.color === 'w' && targetSquare[1] === '8') ||
           (movingPiece.color === 'b' && targetSquare[1] === '1'));
        onSetPremove({
          from: draggedSquare,
          to: targetSquare,
          promotion: isPromotion ? 'q' : undefined,
        });
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }

    setDraggedSquare(null);
  }, [draggedSquare, legalMoves, chess, onMove, isMyTurn, onSetPremove]);

  const handleDragEnd = useCallback(() => {
    setDraggedSquare(null);
  }, []);

  function handlePromotion(pieceType) {
    if (promotionData) {
      onMove(promotionData.from, promotionData.to, pieceType);
      setPromotionData(null);
    }
  }

  return (
    <div className="relative">
      <div className="chessboard" style={{ maxWidth: '100%', aspectRatio: '1' }}>
        {displayRanks.map((rank, ri) =>
          displayFiles.map((file, fi) => {
            const square = `${file}${rank}`;
            const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
            const piece = chess.get(square);

            // Square classes
            const classes = ['square'];
            classes.push(isLight ? 'light' : 'dark');

            if (selectedSquare === square) classes.push('selected');
            if (legalMoves.includes(square)) {
              if (!isMyTurn && !isSpectator) {
                // Premove target dots
                classes.push(piece ? 'premove-capture' : 'premove-target');
              } else {
                classes.push(piece ? 'legal-capture' : 'legal-move');
              }
            }
            if (lastMove && (lastMove.from === square || lastMove.to === square)) {
              classes.push('last-move');
            }
            if (isCheck && piece && piece.type === 'k' && piece.color === turn) {
              classes.push('check');
            }
            if (premove && (premove.from === square || premove.to === square)) {
              classes.push('premove-highlight');
            }
            if (myMines.includes(square)) {
              classes.push('mine-own');
            }
            if (explodedSquares.includes(square)) {
              classes.push('exploded');
            }

            // File/rank labels
            const showFile = isFlipped ? ri === 0 : ri === 7;
            const showRank = isFlipped ? fi === 7 : fi === 0;

            return (
              <div
                key={square}
                className={classes.join(' ')}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                data-square={square}
              >
                {/* Rank label */}
                {showRank && <span className="rank-label">{rank}</span>}
                {/* File label */}
                {showFile && <span className="file-label">{file}</span>}

                {/* Piece */}
                {piece && (
                  <img
                    src={getPieceImage(piece)}
                    alt={`${piece.color}${piece.type}`}
                    className={`piece ${draggedSquare === square ? 'opacity-50' : ''}`}
                    draggable={!isSpectator && piece.color === myColor && gameStatus === 'playing'}
                    onDragStart={(e) => handleDragStart(e, square)}
                    onDragEnd={handleDragEnd}
                  />
                )}

                {/* Mine indicator for own mines */}
                {myMines.includes(square) && !piece && (
                  <span style={{
                    position: 'absolute',
                    fontSize: '1.2rem',
                    opacity: 0.4,
                    zIndex: 1,
                  }}>💣</span>
                )}

                {/* Explosion effect */}
                {explosionSquare === square && (
                  <div className="explosion-effect animate-explosion"></div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Promotion modal */}
      {promotionData && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="glass rounded-xl p-6 text-center animate-slide-up">
            <h3 className="text-lg font-bold mb-4">Promote Pawn</h3>
            <div className="flex gap-3 justify-center">
              {['q', 'r', 'b', 'n'].map((type) => {
                const img = getPieceImage({ type, color: myColor });
                return (
                  <button
                    key={type}
                    onClick={() => handlePromotion(type)}
                    className="w-16 h-16 rounded-lg flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
                  >
                    <img src={img} alt={type} className="w-12 h-12" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPromotionData(null)}
              className="btn-secondary mt-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
