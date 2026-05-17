import React, { useState } from 'react';

const TIME_PRESETS = [1, 2, 3, 5, 10, 15, 30];
const INCREMENT_PRESETS = [0, 1, 2, 3, 5, 10];

const ELO_PRESETS = [
  { elo: 400,  label: 'Beginner',  emoji: '🟢' },
  { elo: 800,  label: 'Casual',    emoji: '🟡' },
  { elo: 1200, label: 'Club',      emoji: '🟠' },
  { elo: 1500, label: 'Strong',    emoji: '🔴' },
  { elo: 1800, label: 'Advanced',  emoji: '🟣' },
  { elo: 2000, label: 'Expert',    emoji: '💎' },
  { elo: 2500, label: 'Master',    emoji: '👑' },
];

export default function CreateMatchModal({ onClose, onCreate }) {
  const [timeControl, setTimeControl] = useState(10);
  const [increment, setIncrement] = useState(0);
  const [pieceColor, setPieceColor] = useState('random');
  const [visibility, setVisibility] = useState('public');
  const [gameMode, setGameMode] = useState('normal');
  const [opponentType, setOpponentType] = useState('human');
  const [elo, setElo] = useState(800);
  const [customElo, setCustomElo] = useState('');
  const [useCustomElo, setUseCustomElo] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [customIncrement, setCustomIncrement] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [useCustomIncrement, setUseCustomIncrement] = useState(false);

  const activeElo = useCustomElo ? Math.max(200, Math.min(3200, parseInt(customElo) || 800)) : elo;

  // Compute gauge position (0-100%)
  const gaugePercent = Math.min(100, Math.max(0, ((activeElo - 200) / (3200 - 200)) * 100));

  function getEloColor(eloVal) {
    if (eloVal <= 400) return '#22c55e';
    if (eloVal <= 800) return '#eab308';
    if (eloVal <= 1200) return '#f97316';
    if (eloVal <= 1500) return '#ef4444';
    if (eloVal <= 1800) return '#a855f7';
    if (eloVal <= 2200) return '#3b82f6';
    return '#fbbf24';
  }

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
      opponentType,
      elo: activeElo,
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

          {/* Opponent */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Opponent</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpponentType('human')}
                className={`p-2 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                  opponentType === 'human'
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                }`}
              >
                👤 Human
              </button>
              <button
                type="button"
                onClick={() => setOpponentType('bot')}
                className={`p-2 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                  opponentType === 'bot'
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                }`}
              >
                🤖 Computer
              </button>
            </div>
          </div>

          {/* ELO Selector (only if bot) */}
          {opponentType === 'bot' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Bot Strength — <span style={{ color: getEloColor(activeElo), fontWeight: 700 }}>{activeElo} ELO</span>
              </label>

              {/* ELO Preset Buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                {ELO_PRESETS.map((preset) => (
                  <button
                    key={preset.elo}
                    type="button"
                    onClick={() => { setElo(preset.elo); setUseCustomElo(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      !useCustomElo && elo === preset.elo
                        ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-white'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                    }`}
                    title={`${preset.label} (~${preset.elo} ELO)`}
                  >
                    {preset.emoji} {preset.elo}
                  </button>
                ))}
                <input
                  type="number"
                  className="input w-20 text-center text-sm"
                  placeholder="Custom"
                  value={customElo}
                  onChange={(e) => { setCustomElo(e.target.value); setUseCustomElo(true); }}
                  onFocus={() => setUseCustomElo(true)}
                  min={200}
                  max={3200}
                />
              </div>

              {/* ELO Gauge Bar */}
              <div style={{
                position: 'relative',
                height: '6px',
                borderRadius: '3px',
                background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7, #3b82f6, #fbbf24)',
                overflow: 'visible',
              }}>
                <div style={{
                  position: 'absolute',
                  left: `${gaugePercent}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: getEloColor(activeElo),
                  border: '2px solid white',
                  boxShadow: `0 0 8px ${getEloColor(activeElo)}`,
                  transition: 'left 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
                }} />
              </div>
              <div className="flex justify-between mt-1" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                <span>200</span>
                <span>3200</span>
              </div>
            </div>
          )}

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
