import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import socket from './socket';
import Home from './components/Home';
import Game from './components/Game';
import UsernameModal from './components/UsernameModal';

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('chess_username') || '');
  const [showUsernameModal, setShowUsernameModal] = useState(!username);

  useEffect(() => {
    if (username && !socket.connected) {
      socket.connect();
    }
    return () => {
      // Don't disconnect on unmount to persist connection
    };
  }, [username]);

  function handleSetUsername(name) {
    localStorage.setItem('chess_username', name);
    setUsername(name);
    setShowUsernameModal(false);
    if (!socket.connected) {
      socket.connect();
    }
  }

  if (showUsernameModal || !username) {
    return <UsernameModal onSubmit={handleSetUsername} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home username={username} />} />
      <Route path="/join/:code" element={<Game username={username} />} />
      <Route path="/game/:code" element={<Game username={username} />} />
    </Routes>
  );
}
