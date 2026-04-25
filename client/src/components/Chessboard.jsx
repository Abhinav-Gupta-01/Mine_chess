import React, { useState, useMemo, useCallback } from 'react';
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

  const handleSquareClick = useCallback((square) => {
    if (!isMyTurn || isSpectator || gameStatus !== 'playing') return;

    const piece = chess.get(square);

    // If we have a selected piece
    if (selectedSquare) {
      // Clicking same square — deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Check if this is a legal move
      if (legalMoves.includes(square)) {
        // Check for promotion
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

      // Clicking a different own piece — select it instead
      if (piece && piece.color === myColor) {
        selectPiece(square);
        return;
      }

      // Invalid target — deselect
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // No piece selected — select own piece
    if (piece && piece.color === myColor) {
      selectPiece(square);
    }
  }, [selectedSquare, legalMoves, isMyTurn, myColor, chess, isSpectator, gameStatus, onMove]);

  function selectPiece(square) {
    setSelectedSquare(square);
    const moves = chess.moves({ square, verbose: true });
    setLegalMoves(moves.map((m) => m.to));
  }

  const handleDragStart = useCallback((e, square) => {
    if (!isMyTurn || isSpectator || gameStatus !== 'playing') {
      e.preventDefault();
      return;
    }
    const piece = chess.get(square);
    if (!piece || piece.color !== myColor) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', square);
    setDraggedSquare(square);
    selectPiece(square);
  }, [isMyTurn, isSpectator, gameStatus, chess, myColor]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Necessary to allow dropping
  }, []);

  const handleDrop = useCallback((e, targetSquare) => {
    e.preventDefault();
    if (!draggedSquare) return;
    
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
    
    setDraggedSquare(null);
  }, [draggedSquare, legalMoves, chess, onMove]);

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
              classes.push(piece ? 'legal-capture' : 'legal-move');
            }
            if (lastMove && (lastMove.from === square || lastMove.to === square)) {
              classes.push('last-move');
            }
            if (isCheck && piece && piece.type === 'k' && piece.color === turn) {
              classes.push('check');
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
                    draggable={!isSpectator && isMyTurn && piece.color === myColor}
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
