import React, { useRef, useEffect } from 'react';

export default function MoveHistory({ moves }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Group moves into pairs (white, black)
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
    });
  }

  if (moves.length === 0) {
    return (
      <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No moves yet</p>
      </div>
    );
  }

  return (
    <div className="move-history" ref={scrollRef}>
      {movePairs.map((pair) => (
        <div key={pair.number} className="move-row">
          <span className="move-number">{pair.number}.</span>
          <span className="move-san">{pair.white?.san || ''}</span>
          <span className="move-san">{pair.black?.san || ''}</span>
        </div>
      ))}
    </div>
  );
}
