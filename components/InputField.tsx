
import React, { useState, KeyboardEvent } from 'react';
import Loader from './Loader';
import { ChevronRightIcon } from './icons';

interface InputFieldProps {
  onQuery: (query: string) => void;
  isLoading: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ onQuery, isLoading }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onQuery(value);
      setValue('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex items-center">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Отправь сигнал..."
        disabled={isLoading}
        rows={1}
        className="w-full resize-none bg-transparent p-3 lg:p-4 pr-14 text-text placeholder:text-text-muted/50 focus:outline-none font-serif text-base lg:text-lg max-h-32 min-h-[48px] lg:min-h-[56px]"
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !value.trim()}
        className={`absolute right-2 p-3 lg:p-2 rounded-full transition-all duration-200 active:scale-95 ${
            value.trim() && !isLoading 
            ? 'bg-primary text-black shadow-glow-ember' 
            : 'bg-white/5 text-text-muted cursor-not-allowed'
        }`}
        aria-label="Send message"
      >
        {isLoading ? <div className="scale-75"><Loader /></div> : <ChevronRightIcon className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default InputField;
