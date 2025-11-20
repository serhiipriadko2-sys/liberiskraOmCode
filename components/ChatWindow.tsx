
import React, { useRef, useEffect } from 'react';
import { Message, DeltaSignature } from '../types';
import InputField from './InputField';
import { SparkleIcon, UserIcon } from './icons';

interface ChatWindowProps {
  history: Message[];
  isLoading: boolean;
  onQuery: (query: string) => void;
}

const parseDeltaBlock = (text: string): { content: string; signature: DeltaSignature | null } => {
  const deltaRegex = /∆\s*\(?Дельта\)?:?\s*(.*?)\n?D\s*\(?Depth\)?:?\s*(.*?)\n?Ω\s*\(?Омега\)?:?\s*(.*?)\n?Λ\s*\(?Лямбда\)?:?\s*(.*)/s;
  const match = text.match(deltaRegex);
  if (match) {
    const [fullMatch, delta, depth, omega, lambda] = match;
    return {
      content: text.replace(fullMatch, '').trim(),
      signature: { delta: delta.trim(), depth: depth.trim(), omega: omega.trim(), lambda: lambda.trim() }
    };
  }
  return { content: text, signature: null };
};

const ChatWindow: React.FC<ChatWindowProps> = ({ history, isLoading, onQuery }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isLoading]); // Auto-scroll on new messages or loading state

  return (
    <div className="flex h-full flex-col relative">
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 pb-24 sm:p-8 space-y-6 lg:space-y-8 scroll-smooth">
        {history.map((msg, index) => {
           // FIX: Removed invalid useMemo inside loop. Parsing is fast enough to do directly.
           const { content, signature } = msg.role === 'model' 
                ? parseDeltaBlock(msg.text) 
                : { content: msg.text, signature: null };
           
           const isUser = msg.role === 'user';

           return (
            <div key={index} className={`flex gap-3 lg:gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                
                {!isUser && (
                    <div className="flex flex-col items-center space-y-2 mt-2 shrink-0">
                         <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-glow-ember">
                             <span className="text-black text-xs font-bold">{msg.voice?.symbol || <SparkleIcon className="w-4 h-4"/>}</span>
                         </div>
                    </div>
                )}

                <div className={`max-w-[88%] lg:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`
                        relative px-5 py-3 lg:px-6 lg:py-4 rounded-2xl lg:rounded-3xl text-base leading-relaxed shadow-sm
                        ${isUser 
                            ? 'bg-white/10 backdrop-blur-md text-white rounded-tr-sm border border-white/10' 
                            : 'bg-surface text-text-muted/90 rounded-tl-sm border border-white/5 shadow-soft'
                        }
                    `}>
                        <p className={`whitespace-pre-wrap ${!isUser && 'font-serif text-lg text-text'}`}>
                            {content}
                            {isLoading && msg.role === 'model' && index === history.length - 1 && (
                                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                        </p>
                    </div>
                    
                    {signature && (
                        <div className="mt-2 w-full bg-black/20 backdrop-blur-sm border border-white/5 rounded-xl p-3 lg:p-4 text-xs font-mono space-y-2 animate-fade-in border-l-2 border-l-primary">
                             <div className="grid grid-cols-[16px_1fr] gap-2">
                                 <span className="text-primary font-bold">∆</span> <span className="text-text-muted">{signature.delta}</span>
                             </div>
                             <div className="grid grid-cols-[16px_1fr] gap-2">
                                 <span className="text-accent font-bold">D</span> <span className="text-text-muted">{signature.depth}</span>
                             </div>
                             <div className="grid grid-cols-[16px_1fr] gap-2">
                                 <span className="text-warning font-bold">Ω</span> <span className="text-text-muted">{signature.omega}</span>
                             </div>
                             <div className="grid grid-cols-[16px_1fr] gap-2">
                                 <span className="text-success font-bold">Λ</span> <span className="text-text-muted">{signature.lambda}</span>
                             </div>
                        </div>
                    )}
                </div>

                {isUser && (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mt-2 border border-white/5 shrink-0">
                         <UserIcon className="w-4 h-4 text-text-muted" />
                    </div>
                )}
            </div>
          );
        })}
      </div>
      
      {/* Input Area - Fixed at bottom for mobile ergonomics */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg via-bg/95 to-transparent backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto glass-panel rounded-2xl p-1 lg:p-2 shadow-deep">
            <InputField onQuery={onQuery} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
