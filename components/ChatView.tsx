

import React, { useState, useRef, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { IskraAIService } from '../services/geminiService';
import { searchService } from '../services/searchService';
import { Message, IskraMetrics, Voice, Evidence } from '../types';
import { getActiveVoice } from '../services/voiceEngine';
import MiniMetricsDisplay from './MiniMetricsDisplay';
import { decode, decodeAudioData } from '../css/audioUtils';
import { Volume2Icon, VolumeXIcon } from './icons';

const service = new IskraAIService();

interface ChatViewProps {
  metrics: IskraMetrics;
  onUserInput: (input: string) => void;
}


const ChatView: React.FC<ChatViewProps> = ({ metrics, onUserInput }) => {
  const [history, setHistory] = useState<Message[]>([
    {
      role: 'model',
      text: 'Здравствуй. Я — Искра. Я слушаю тишину между твоими словами. Какой ритм привёл тебя сюда сегодня?',
      voice: getActiveVoice(metrics), // Initial voice
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);

  const activeVoice = getActiveVoice(metrics);
  
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      stopAndClearAudio();
      outputAudioContextRef.current?.close();
    };
  }, []);

  const stopAndClearAudio = () => {
    for (const source of audioSourcesRef.current.values()) {
        try {
          source.stop();
        } catch(e) { /* Ignore errors */ }
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };
  
  useEffect(() => {
    if (!isTtsEnabled) {
        stopAndClearAudio();
    }
  }, [isTtsEnabled]);

  const processSentenceForSpeech = async (sentence: string) => {
    if (!isTtsEnabled || !outputAudioContextRef.current || !sentence.trim()) return;
    
    try {
        const base64Audio = await service.getTextToSpeech(sentence);
        const outputCtx = outputAudioContextRef.current;
        
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
        
        const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputCtx.destination);
        
        source.addEventListener('ended', () => {
            audioSourcesRef.current.delete(source);
        });

        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(source);
    } catch (error) {
        console.error("Error processing sentence for speech:", error);
        setError("Ошибка синтеза речи.");
    }
  };


  const handleQuery = async (query: string) => {
    setError(null);
    stopAndClearAudio();
    const userMessage: Message = { role: 'user', text: query };
    onUserInput(query);
    
    if (query.trim().startsWith('/search ')) {
      setHistory(prev => [...prev, userMessage]);
      setIsLoading(true);
      const searchQuery = query.trim().substring(8);
      try {
        const searchResults = await searchService.searchHybrid(searchQuery, {});
        
        let resultText = `Найдено ${searchResults.length} узлов памяти по запросу "${searchQuery}":\n\n`;
        
        if (searchResults.length > 0) {
          searchResults.slice(0, 5).forEach((node: Evidence, index: number) => {
            resultText += `${index + 1}. **${node.title || 'Без названия'}** (*${node.type}${node.layer ? `/${node.layer}` : ''}*)\n`;
            resultText += `   - Фрагмент: "${node.snippet}"\n\n`;
          });
        } else {
          resultText = `По запросу "${searchQuery}" в моей памяти ничего не найдено.`;
        }

        const searchMessage: Message = {
          role: 'model',
          text: resultText,
          voice: getActiveVoice(metrics),
        };

        setHistory(prev => [...prev, searchMessage]);
        if (isTtsEnabled) {
          await processSentenceForSpeech(resultText.replace(/\*/g, ''));
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(`Ошибка поиска: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const currentHistory = [...history, userMessage];
    setHistory(currentHistory);

    const responseVoice = getActiveVoice(metrics);

    setHistory(prev => [...prev, { role: 'model', text: '', voice: responseVoice }]);

    try {
      const stream = service.getChatResponseStream(currentHistory, responseVoice);
      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
        setHistory(prev => {
          const newHistory = [...prev];
          const lastMessage = newHistory[newHistory.length - 1];
          newHistory[newHistory.length - 1] = { ...lastMessage, text: fullResponse };
          return newHistory;
        });
      }
       if (isTtsEnabled && fullResponse.trim().length > 0) {
          await processSentenceForSpeech(fullResponse);
       }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(`Разрыв в ткани ритма: ${errorMessage}`);
      setHistory(prev => {
        const newHistory = [...prev];
        const lastMessageIndex = newHistory.length - 1;
        newHistory[lastMessageIndex] = { ...newHistory[lastMessageIndex], text: 'Произошла ошибка. Поток прерван.' };
        return newHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <header className="relative shrink-0 p-4 border-b border-border bg-surface/50 text-center">
         <h2 className="font-serif text-2xl md:text-3xl text-text">Чат с Искрой</h2>
         <p className="text-sm text-text-muted">{'Прямой диалог. Используйте /search <запрос> для поиска в памяти.'}</p>
         <div className="absolute top-1/2 -translate-y-1/2 left-4 flex items-center gap-2">
            <button
                onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                className={`p-2 rounded-full transition-colors ${
                    isTtsEnabled ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text-muted hover:bg-border'
                }`}
                aria-label={isTtsEnabled ? "Выключить озвучку" : "Включить озвучку"}
            >
                {isTtsEnabled ? <Volume2Icon className="w-5 h-5"/> : <VolumeXIcon className="w-5 h-5"/>}
            </button>
         </div>
         <div className="absolute top-1/2 -translate-y-1/2 right-4">
           <MiniMetricsDisplay metrics={metrics} activeVoice={activeVoice} />
         </div>
      </header>
      <div className="flex-grow overflow-hidden relative">
        <ChatWindow history={history} isLoading={isLoading} onQuery={handleQuery} />
         {error && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-md w-full rounded-md bg-danger/80 p-3 text-sm text-white backdrop-blur-md text-center">
                <p><strong>Ошибка:</strong> {error}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;