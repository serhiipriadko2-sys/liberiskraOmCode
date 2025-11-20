import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-accent"></div>
    </div>
  );
};

export default Loader;
