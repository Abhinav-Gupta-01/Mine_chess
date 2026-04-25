// Chess piece SVG URLs from Wikipedia/Wikimedia (public domain)
// Using unicode chess pieces rendered as text is the fallback
const PIECE_UNICODE = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

// SVG piece images from lichess (cburnett set, open source)
const BASE = 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett';

export const PIECE_IMAGES = {
  wK: `${BASE}/wK.svg`,
  wQ: `${BASE}/wQ.svg`,
  wR: `${BASE}/wR.svg`,
  wB: `${BASE}/wB.svg`,
  wN: `${BASE}/wN.svg`,
  wP: `${BASE}/wP.svg`,
  bK: `${BASE}/bK.svg`,
  bQ: `${BASE}/bQ.svg`,
  bR: `${BASE}/bR.svg`,
  bB: `${BASE}/bB.svg`,
  bN: `${BASE}/bN.svg`,
  bP: `${BASE}/bP.svg`,
};

export function getPieceKey(piece) {
  if (!piece) return null;
  return `${piece.color}${piece.type.toUpperCase()}`;
}

export function getPieceImage(piece) {
  const key = getPieceKey(piece);
  return key ? PIECE_IMAGES[key] : null;
}

export function getPieceUnicode(piece) {
  const key = getPieceKey(piece);
  return key ? PIECE_UNICODE[key] : null;
}

export { PIECE_UNICODE };
