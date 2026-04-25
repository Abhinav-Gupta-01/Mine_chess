import React from 'react';
import { PIECE_UNICODE } from '../pieces';

export default function PlayerPanel({ username, color, clock, isActive, connected, capturedPieces = [] }) {
  const minutes = Math.floor(Math.max(0, clock) / 60000);
  const seconds = Math.floor((Math.max(0, clock) % 60000) / 1000);
  const tenths = Math.floor((Math.max(0, clock) % 1000) / 100);
  const isLow = clock < 30000; // Less than 30s

  const timeStr = clock < 60000
    ? `${seconds}.${tenths}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Map captured pieces to unicode
  const pieceOrder = { q: 0, r: 1, b: 2, n: 3, p: 4 };
  const sortedCaptured = [...capturedPieces].sort((a, b) => (pieceOrder[a.type] ?? 5) - (pieceOrder[b.type] ?? 5));

  return (
    <div className="flex items-center justify-between py-2 px-1 gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Color indicator */}
        <div
          className="w-4 h-4 rounded-sm flex-shrink-0"
          style={{
            background: color === 'w' ? '#e8e8f0' : '#2a2a3d',
            border: '1px solid var(--border-color)',
          }}
        />
        {/* Username */}
        <span className="font-semibold text-sm truncate">{username}</span>
        {/* Connected status */}
        {!connected && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
            ⚡ offline
          </span>
        )}
        {/* Captured pieces */}
        <div className="captured-pieces ml-1">
          {sortedCaptured.map((p, i) => {
            const key = `${p.color}${p.type.toUpperCase()}`;
            return (
              <span key={i} className="captured-piece" title={p.type}>
                {PIECE_UNICODE[key] || '?'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Clock */}
      <div className={`clock ${isActive ? (isLow ? 'danger' : 'active') : 'inactive'}`}>
        {timeStr}
      </div>
    </div>
  );
}
