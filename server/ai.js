const stockfish = require('stockfish');

class ChessAI {
  constructor(elo = 1200, isLandmine = false) {
    this.elo = Math.max(200, Math.min(3200, parseInt(elo) || 1200));
    this.isLandmine = isLandmine;
    this.engine = null;
    this.isReady = false;

    // Map ELO to Stockfish Skill Level (0–20), linearly across ELO 200–2500
    this.skillLevel = Math.round(
      Math.min(20, Math.max(0, ((this.elo - 200) / (2500 - 200)) * 20))
    );

    // Map ELO to search depth (1–20), linearly across ELO 200–2500+
    this.depth = Math.round(
      Math.min(20, Math.max(1, 1 + ((this.elo - 200) / (2500 - 200)) * 19))
    );

    // Map ELO to move time (ms): exponential curve from 50ms to 5000ms
    this.moveTime = Math.round(
      50 * Math.pow(100, (this.elo - 200) / (3200 - 200))
    );

    console.log(
      `[ChessAI] ELO=${this.elo} → Skill=${this.skillLevel}, Depth=${this.depth}, MoveTime=${this.moveTime}ms`
    );

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

    // Set Skill Level (always supported)
    this.engine.sendCommand(`setoption name Skill Level value ${this.skillLevel}`);

    // Attempt native ELO limiting (may not be supported in all Stockfish builds)
    try {
      this.engine.sendCommand('setoption name UCI_LimitStrength value true');
      this.engine.sendCommand(`setoption name UCI_Elo value ${this.elo}`);
    } catch (e) {
      // Not supported in this build — Skill Level alone will handle it
      console.log('[ChessAI] UCI_LimitStrength not supported, using Skill Level only');
    }

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
      this.engine.sendCommand(`go depth ${this.depth} movetime ${this.moveTime}${searchMovesCmd}`);
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
