import React from 'react';

const REASON_TEXT = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  timeout: 'Time Out',
  resignation: 'Resignation',
  draw_agreement: 'Draw by Agreement',
  threefold_repetition: 'Threefold Repetition',
  insufficient_material: 'Insufficient Material',
  draw: 'Draw',
  abandonment: 'Abandonment',
};

export default function GameOverModal({
  result,
  myColor,
  isSpectator,
  players,
  onRematch,
  onAcceptRematch,
  onHome,
  myRematchSent,
  rematchRequested,
}) {
  const { reason, winner } = result;

  let title, subtitle, emoji;

  if (!winner) {
    title = 'Draw!';
    subtitle = REASON_TEXT[reason] || 'Game drawn';
    emoji = '🤝';
  } else if (isSpectator) {
    const winnerName = players[winner]?.username || (winner === 'w' ? 'White' : 'Black');
    title = `${winnerName} Wins!`;
    subtitle = REASON_TEXT[reason] || '';
    emoji = '🏆';
  } else if (winner === myColor) {
    title = 'You Win!';
    subtitle = REASON_TEXT[reason] || '';
    emoji = '🎉';
  } else {
    title = 'You Lost';
    subtitle = REASON_TEXT[reason] || '';
    emoji = '😔';
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content text-center">
        <div className="text-5xl mb-3 animate-float">{emoji}</div>
        <h2 className="text-2xl font-bold mb-1">{title}</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>

        {/* Score summary */}
        <div className="flex items-center justify-center gap-6 mb-6 p-4 rounded-xl"
             style={{ background: 'var(--bg-primary)' }}>
          <div className="text-center">
            <div className="w-6 h-6 rounded-sm mx-auto mb-1"
                 style={{ background: '#e8e8f0', border: '1px solid var(--border-color)' }} />
            <p className="text-sm font-semibold">{players.w?.username || 'White'}</p>
            <p className="text-xl font-bold" style={{ color: winner === 'w' ? 'var(--success)' : winner === null ? 'var(--warning)' : 'var(--danger)' }}>
              {winner === 'w' ? '1' : winner === null ? '½' : '0'}
            </p>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>—</span>
          <div className="text-center">
            <div className="w-6 h-6 rounded-sm mx-auto mb-1"
                 style={{ background: '#2a2a3d', border: '1px solid var(--border-color)' }} />
            <p className="text-sm font-semibold">{players.b?.username || 'Black'}</p>
            <p className="text-xl font-bold" style={{ color: winner === 'b' ? 'var(--success)' : winner === null ? 'var(--warning)' : 'var(--danger)' }}>
              {winner === 'b' ? '1' : winner === null ? '½' : '0'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!isSpectator && (
            <>
              {rematchRequested ? (
                <button onClick={onAcceptRematch} className="btn-success w-full">
                  ✅ Accept Rematch
                </button>
              ) : myRematchSent ? (
                <button className="btn-secondary w-full" disabled>
                  ⏳ Rematch Requested...
                </button>
              ) : (
                <button onClick={onRematch} className="btn-primary w-full">
                  🔄 Rematch
                </button>
              )}
            </>
          )}
          <button onClick={onHome} className="btn-secondary w-full">
            ← Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
