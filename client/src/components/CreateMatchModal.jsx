import React, { useState } from 'react';

const TIME_PRESETS = [1, 2, 3, 5, 10, 15, 30];
const INCREMENT_PRESETS = [0, 1, 2, 3, 5, 10];

export default function CreateMatchModal({ onClose, onCreate }) {
  const [timeControl, setTimeControl] = useState(10);
  const [increment, setIncrement] = useState(0);
  const [pieceColor, setPieceColor] = useState('random');
  const [visibility, setVisibility] = useState('public');
  const [gameMode, setGameMode] = useState('normal');
  const [customTime, setCustomTime] = useState('');
  const [customIncrement, setCustomIncrement] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [useCustomIncrement, setUseCustomIncrement] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const tc = useCustomTime ? parseInt(customTime) || 10 : timeControl;
    const inc = useCustomIncrement ? parseInt(customIncrement) || 0 : increment;
    onCreate({
      timeControl: Math.max(1, Math.min(180, tc)),
      increment: Math.max(0, Math.min(60, inc)),
      pieceColor,
      visibility,
      gameMode,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">⚔️ Create Match</h2>
          <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100 transition-opacity cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Game Mode */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Game Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGameMode('normal')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  gameMode === 'normal'
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                }`}
              >
                <div className="text-xl mb-1">♟️</div>
                <div className="text-sm font-semibold">Normal</div>
              </button>
              <button
                type="button"
                onClick={() => setGameMode('landmine')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  gameMode === 'landmine'
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                }`}
              >
                <div className="text-xl mb-1">💣</div>
                <div className="text-sm font-semibold">Landmine</div>
              </button>
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Time Control (min/side)
            </label>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTimeControl(t); setUseCustomTime(false); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                    !useCustomTime && timeControl === t
                      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-white'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                  }`}
                >
                  {t}
                </button>
              ))}
              <input
                type="number"
                className="input w-20 text-center text-sm"
                placeholder="Custom"
                value={customTime}
                onChange={(e) => { setCustomTime(e.target.value); setUseCustomTime(true); }}
                onFocus={() => setUseCustomTime(true)}
                min={1}
                max={180}
              />
            </div>
          </div>

          {/* Increment */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Increment (sec/move)
            </label>
            <div className="flex flex-wrap gap-2">
              {INCREMENT_PRESETS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setIncrement(i); setUseCustomIncrement(false); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                    !useCustomIncrement && increment === i
                      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-white'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                  }`}
                >
                  {i}
                </button>
              ))}
              <input
                type="number"
                className="input w-20 text-center text-sm"
                placeholder="Custom"
                value={customIncrement}
                onChange={(e) => { setCustomIncrement(e.target.value); setUseCustomIncrement(true); }}
                onFocus={() => setUseCustomIncrement(true)}
                min={0}
                max={60}
              />
            </div>
          </div>

          {/* Piece Color */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Piece Color</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'white', label: '♔ White', emoji: '⬜' },
                { val: 'random', label: '🎲 Random', emoji: '🎲' },
                { val: 'black', label: '♚ Black', emoji: '⬛' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPieceColor(opt.val)}
                  className={`p-2 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                    pieceColor === opt.val
                      ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-2 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                  visibility === 'public'
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                }`}
              >
                🌐 Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-2 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                  visibility === 'private'
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                }`}
              >
                🔒 Private
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary w-full text-lg py-3">
            Create Match
          </button>
        </form>
      </div>
    </div>
  );
}
