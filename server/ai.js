const stockfish = require('stockfish');

class ChessAI {
  constructor(difficulty = 3, isLandmine = false) {
    this.difficulty = parseInt(difficulty) || 3;
    this.isLandmine = isLandmine;
    this.engine = null;
    this.isReady = false;

    // Mapping difficulty (1-5) to Stockfish Skill Level (0-20)
    this.skillLevel = Math.max(0, Math.min(20, (this.difficulty - 1) * 5));
    
    // Search depth mapping
    this.depth = [1, 5, 10, 15, 20][this.difficulty - 1] || 10;

    // Initialize engine asynchronously
    this.initPromise = this.init();
  }

  async init() {
    // Using 'lite-single' for better compatibility in server environments
    this.engine = await stockfish('lite-single');
    
    this.engine.listener = (line) => {
      if (line === 'readyok') {
        this.isReady = true;
      }
      if (this.onMessageCallback) {
        this.onMessageCallback(line);
      }
    };

    this.engine.sendCommand('uci');
    this.engine.sendCommand(`setoption name Skill Level value ${this.skillLevel}`);
    this.engine.sendCommand('isready');
  }

  async getBestMove(chess, roomMines = { w: [], b: [] }) {
    if (!this.engine) await this.initPromise;

    return new Promise((resolve) => {
      const fen = chess.fen();
      const myColor = chess.turn();
      
      let searchMovesCmd = '';
      if (this.isLandmine) {
        const allMoves = chess.moves({ verbose: true });
        const safeMoves = allMoves.filter(m => !roomMines[myColor].includes(m.to));
        
        if (safeMoves.length > 0) {
          const moveList = safeMoves.map(m => m.from + m.to + (m.promotion || '')).join(' ');
          searchMovesCmd = ` searchmoves ${moveList}`;
        }
      }

      this.onMessageCallback = (line) => {
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMoveUCI = parts[1];
          
          if (bestMoveUCI === '(none)') {
            resolve(null);
          } else {
            const from = bestMoveUCI.substring(0, 2);
            const to = bestMoveUCI.substring(2, 4);
            const promotion = bestMoveUCI.length > 4 ? bestMoveUCI.substring(4, 5) : null;
            
            const move = chess.moves({ verbose: true }).find(m => 
              m.from === from && m.to === to && (!promotion || m.promotion === promotion)
            );
            resolve(move || null);
          }
          this.onMessageCallback = null;
        }
      };

      this.engine.sendCommand(`position fen ${fen}`);
      this.engine.sendCommand(`go depth ${this.depth}${searchMovesCmd}`);
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
    // The stockfish npm package engine object doesn't always have a terminate method 
    // depending on the version/flavor, but we can try.
    if (this.engine && typeof this.engine.terminate === 'function') {
      this.engine.terminate();
    }
  }
}

module.exports = ChessAI;
