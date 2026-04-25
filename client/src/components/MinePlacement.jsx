import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { getPieceImage } from '../pieces';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function MinePlacement({ myColor, fen, onPlaceMines, error }) {
  const [selectedMines, setSelectedMines] = useState([]);

  const chess = useMemo(() => {
    const c = new Chess();
    try { c.load(fen); } catch (e) { /* ignore */ }
    return c;
  }, [fen]);

  const isFlipped = myColor === 'b';
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;

  // Valid rows for mine placement
  const validRows = myColor === 'w' ? ['3', '4'] : ['5', '6'];

  function isValidMineSquare(square) {
    const rank = square[1];
    if (!validRows.includes(rank)) return false;
    const piece = chess.get(square);
    return !piece; // Must be empty
  }

  function toggleMine(square) {
    if (!isValidMineSquare(square)) return;

    if (selectedMines.includes(square)) {
      setSelectedMines(selectedMines.filter((s) => s !== square));
    } else if (selectedMines.length < 3) {
      setSelectedMines([...selectedMines, square]);
    }
  }

  function handleConfirm() {
    if (selectedMines.length === 3) {
      onPlaceMines(selectedMines);
    }
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">💣</div>
        <h2 className="text-2xl font-bold mb-1">Place Your Landmines</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Click 3 empty squares in the middle rows
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {myColor === 'w' ? 'Rows 3 & 4' : 'Rows 5 & 6'} •{' '}
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>
            {selectedMines.length}/3 placed
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-2 rounded-lg text-center text-sm"
             style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Board */}
      <div className="chessboard mb-4" style={{ maxWidth: '100%', aspectRatio: '1' }}>
        {displayRanks.map((rank, ri) =>
          displayFiles.map((file, fi) => {
            const square = `${file}${rank}`;
            const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
            const piece = chess.get(square);
            const isValid = isValidMineSquare(square);
            const isPlaced = selectedMines.includes(square);

            const classes = ['square', 'mine-placement-square'];
            classes.push(isLight ? 'light' : 'dark');
            if (isValid) classes.push('available');
            if (isPlaced) classes.push('placed');

            const showFile = isFlipped ? ri === 0 : ri === 7;
            const showRank = isFlipped ? fi === 7 : fi === 0;

            return (
              <div
                key={square}
                className={classes.join(' ')}
                onClick={() => toggleMine(square)}
                style={{ cursor: isValid ? 'pointer' : 'default' }}
              >
                {showRank && <span className="rank-label">{rank}</span>}
                {showFile && <span className="file-label">{file}</span>}

                {piece && (
                  <img
                    src={getPieceImage(piece)}
                    alt={`${piece.color}${piece.type}`}
                    className="piece"
                    draggable={false}
                    style={{ opacity: 0.8 }}
                  />
                )}

                {isPlaced && (
                  <span style={{
                    position: 'absolute',
                    fontSize: '1.5rem',
                    zIndex: 3,
                  }}>💣</span>
                )}

                {isValid && !isPlaced && !piece && (
                  <span style={{
                    position: 'absolute',
                    fontSize: '0.8rem',
                    opacity: 0.2,
                  }}>💣</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={handleConfirm}
        className="btn-primary w-full text-lg py-3"
        disabled={selectedMines.length !== 3}
      >
        {selectedMines.length === 3 ? '✅ Confirm Mine Placement' : `Place ${3 - selectedMines.length} more mine(s)`}
      </button>
    </div>
  );
}
