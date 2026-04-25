import React, { useState } from 'react';

export default function UsernameModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length >= 2 && trimmed.length <= 20) {
      onSubmit(trimmed);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)' }}>
      <div className="animate-slide-up glass rounded-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="text-5xl mb-3 animate-float">♔</div>
          <h1 className="text-3xl font-extrabold tracking-tight"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ChessArena
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Real-time chess battles
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Choose your display name
            </label>
            <input
              type="text"
              className="input text-center text-lg"
              placeholder="Enter username..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full text-lg py-3"
            disabled={name.trim().length < 2}
          >
            Enter Arena ⚔️
          </button>
        </form>

        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          2–20 characters • Stored locally
        </p>
      </div>
    </div>
  );
}
