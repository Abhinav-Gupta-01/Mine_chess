import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

// Get or create a persistent player ID
let playerId = localStorage.getItem('chess_player_id');
if (!playerId) {
  playerId = uuidv4();
  localStorage.setItem('chess_player_id', playerId);
}

export { playerId };
export default socket;
