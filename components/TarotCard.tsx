import React from 'react';

interface RuneStoneProps {
  rune: { name: string; symbol: string };
  isFlipped: boolean;
}

const RuneStone: React.FC<RuneStoneProps> = ({ rune, isFlipped }) => {
  return (
    <div className="w-32 h-40 sm:w-36 sm:h-48 perspective-1000">
      <div 
        className={`relative w-full h-full transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rounded-2xl border-2 border-border bg-surface flex items-center justify-center p-2 shadow-deep shadow-accent/10">
            <div className="w-full h-full border border-text-muted/20 rounded-xl flex items-center justify-center">
                 {/* Subtle pattern can go here */}
            </div>
        </div>
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl border-2 border-text-muted/30 bg-surface2 backdrop-blur-sm flex flex-col justify-center items-center p-4 shadow-deep shadow-accent/20">
          <p className="font-mono text-5xl text-accent drop-shadow-glow-accent mb-2">{rune.symbol}</p>
          <p className="font-serif text-center text-md text-text">{rune.name}</p>
        </div>
      </div>
       <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default RuneStone;