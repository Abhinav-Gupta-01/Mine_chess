import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import CreateMatchModal from './CreateMatchModal';

export default function Home({ username }) {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState('');
  const [waitingRoom, setWaitingRoom] = useState(null);

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onOpponentJoined(data) {
      if (waitingRoom) {
        navigate(`/game/${waitingRoom}`);
      }
    }
    socket.on('opponent_joined', onOpponentJoined);
    return () => socket.off('opponent_joined', onOpponentJoined);
  }, [waitingRoom, navigate]);

  async function fetchPublicRooms() {
    try {
      setLoadingRooms(true);
      const res = await fetch('/api/rooms/public');
      const data = await res.json();
      setPublicRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }

  function handleCreateMatch(settings) {
    socket.emit('create_room', { username, settings }, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      
      if (settings.opponentType === 'bot') {
        navigate(`/game/${response.code}`);
      } else {
        setWaitingRoom(response.code);
      }
      setShowCreateModal(false);
    });
  }

  function handleJoinByCode(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 5) {
      setError('Code must be 5 characters');
      return;
    }
    joinRoom(code);
  }

  function joinRoom(code) {
    setError('');
    socket.emit('join_room', { code, username }, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      navigate(`/game/${code}`);
    });
  }

  function cancelWaiting() {
    setWaitingRoom(null);
  }

  function copyRoomCode() {
    if (waitingRoom) {
      navigator.clipboard.writeText(waitingRoom);
    }
  }

  function copyInviteLink() {
    if (waitingRoom) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${waitingRoom}`);
    }
  }

  // Waiting room overlay
  if (waitingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)' }}>
        <div className="animate-slide-up glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4 animate-float">♟️</div>
          <h2 className="text-2xl font-bold mb-2">Waiting for Opponent</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Share the code or link below
          </p>

          {/* Room Code */}
          <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>ROOM CODE</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold tracking-[0.3em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)' }}>
                {waitingRoom}
              </span>
              <button onClick={copyRoomCode} className="btn-secondary text-xs py-1 px-3">
                Copy
              </button>
            </div>
          </div>

          {/* Invite Link */}
          <button onClick={copyInviteLink} className="btn-primary w-full mb-4">
            📋 Copy Invite Link
          </button>

          {/* Loading spinner */}
          <div className="flex items-center justify-center gap-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                 style={{ animation: 'spin-slow 1s linear infinite' }}></div>
            <span className="text-sm">Searching for opponent...</span>
          </div>

          <button onClick={cancelWaiting} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4"
         style={{ background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="text-center py-8 animate-fade-in">
          <div className="text-5xl mb-3 animate-float">♔</div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ChessArena
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome, <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{username}</span>
          </p>
        </header>

        {/* Error */}
        {error && (
          <div className="max-w-lg mx-auto mb-4 p-3 rounded-lg text-center text-sm animate-shake"
               style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
            {error}
            <button onClick={() => setError('')} className="ml-3 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8 animate-slide-up">
          {/* Create Match */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass rounded-xl p-6 text-left transition-all hover:scale-[1.02] hover:border-[var(--accent)] cursor-pointer group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚔️</div>
            <h3 className="text-lg font-bold mb-1">Create Match</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Set up a new game with custom rules
            </p>
          </button>

          {/* Join by Code */}
          <div className="glass rounded-xl p-6">
            <div className="text-3xl mb-2">🔗</div>
            <h3 className="text-lg font-bold mb-3">Join by Code</h3>
            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <input
                type="text"
                className="input text-center font-mono uppercase tracking-widest"
                placeholder="K3X9W"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
              />
              <button type="submit" className="btn-primary whitespace-nowrap" disabled={joinCode.trim().length !== 5}>
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Public Lobby */}
        <div className="max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🌐 Public Lobby
            </h2>
            <button onClick={fetchPublicRooms} className="btn-secondary text-xs py-1 px-3">
              Refresh
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>No public games available</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create a match to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {publicRooms.map((room) => (
                <div key={room.code}
                     className="glass rounded-xl p-4 flex items-center justify-between transition-all hover:border-[var(--accent)]">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{room.gameMode === 'landmine' ? '💣' : '♟️'}</span>
                    <div>
                      <p className="font-semibold">{room.host}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {room.timeControl}+{room.increment} •{' '}
                        <span className="capitalize">{room.gameMode === 'landmine' ? 'Landmine Chess' : 'Normal'}</span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => joinRoom(room.code)} className="btn-primary text-sm py-2 px-4">
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateModal && (
        <CreateMatchModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMatch}
        />
      )}
    </div>
  );
}
