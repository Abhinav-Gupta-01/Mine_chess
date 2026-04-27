const stockfish = require('stockfish');

class ChessAI {
  constructor(difficulty = 3, isLandmine = false) {
    this.difficulty = parseInt(difficulty) || 3;
    this.isLandmine = isLandmine;
    this.engine = stockfish();
    this.isReady = false;

    // Mapping difficulty (1-5) to Stockfish Skill Level (0-20)
    // 1 -> 0
    // 2 -> 5
    // 3 -> 10
    // 4 -> 15
    // 5 -> 20
    this.skillLevel = Math.max(0, Math.min(20, (this.difficulty - 1) * 5));
    
    // Search depth mapping
    this.depth = [1, 5, 10, 15, 20][this.difficulty - 1] || 10;

    this.engine.onmessage = (line) => {
      if (line === 'readyok') {
        this.isReady = true;
      }
    };

    this.engine.postMessage('uci');
    this.engine.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
    this.engine.postMessage('isready');
  }

  async getBestMove(chess, roomMines = { w: [], b: [] }) {
    return new Promise((resolve) => {
      const fen = chess.fen();
      const myColor = chess.turn();
      
      // Calculate "safe" moves for Landmine mode
      let searchMovesCmd = '';
      if (this.isLandmine) {
        const allMoves = chess.moves({ verbose: true });
        // Filter out moves that land on our own mines
        const safeMoves = allMoves.filter(m => !roomMines[myColor].includes(m.to));
        
        if (safeMoves.length > 0) {
          // Format as list of UCI moves (e.g. "e2e4 e7e5")
          const moveList = safeMoves.map(m => m.from + m.to + (m.promotion || '')).join(' ');
          searchMovesCmd = ` searchmoves ${moveList}`;
        }
      }

      const onMessage = (line) => {
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMoveUCI = parts[1];
          
          if (bestMoveUCI === '(none)') {
            resolve(null);
          } else {
            // Convert UCI to chess.js move object
            const from = bestMoveUCI.substring(0, 2);
            const to = bestMoveUCI.substring(2, 4);
            const promotion = bestMoveUCI.length > 4 ? bestMoveUCI.substring(4, 5) : null;
            
            // Find the move in chess.js legal moves
            const move = chess.moves({ verbose: true }).find(m => 
              m.from === from && m.to === to && (!promotion || m.promotion === promotion)
            );
            resolve(move || null);
          }
          // Remove listener for this request
          // Note: stockfish.js doesn't have a clean way to remove specific listeners easily 
          // if we just overwrite onmessage, so we'll wrap it.
        }
      };

      this.engine.onmessage = onMessage;
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${this.depth}${searchMovesCmd}`);
    });
  }

  static getRandomMines(color) {
    const validRows = color === 'w' ? ['3', '4'] : ['5', '6'];
    const squares = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
    while (squares.length < 3) {
      const row = validRows[Math.floor(Math.random() * validRows.length)];
      const file = files[Math.floor(Math.random() * files.length)];
      const sq = file + row;
      if (!squares.includes(sq)) {
        squares.push(sq);
      }
    }
    return squares;
  }

  cleanup() {
    if (this.engine && typeof this.engine.terminate === 'function') {
      this.engine.terminate();
    }
  }
}

module.exports = ChessAI;
