import React, { useState, useRef } from 'react';
import { IskraAIService } from '../services/geminiService';
import { drawRunes, Rune } from '../utils/tarot';
import { getActiveVoice } from '../services/voiceEngine';
import { IskraMetrics } from '../types';
import RuneStone from './TarotCard';
import Loader from './Loader';

interface RuneCastingProps {
  metrics: IskraMetrics;
  isTtsEnabled: boolean;
  processSentenceForSpeech: (sentence: string) => Promise<void>;
  stopAndClearAudio: () => void;
}

const service = new IskraAIService();

const RuneCasting: React.FC<RuneCastingProps> = ({ metrics, isTtsEnabled, processSentenceForSpeech, stopAndClearAudio }) => {
    const [question, setQuestion] = useState('');
    const [drawnRunes, setDrawnRunes] = useState<Rune[]>([]);
    const [areRunesFlipped, setAreRunesFlipped] = useState(false);
    const [interpretation, setInterpretation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const interpretationRef = useRef<HTMLDivElement>(null);

    const handleCast = async () => {
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setInterpretation('');
        setDrawnRunes([]);
        setAreRunesFlipped(false);
        stopAndClearAudio();

        const runes = drawRunes(3);
        setDrawnRunes(runes);

        setTimeout(() => setAreRunesFlipped(true), 500);
        
        setTimeout(async () => {
            try {
                const activeVoice = getActiveVoice(metrics);
                const stream = service.getRuneInterpretationStream(question, runes.map(r => r.name), activeVoice);
                let fullResponse = '';
                
                for await (const chunk of stream) {
                    fullResponse += chunk;
                    setInterpretation(fullResponse);
                    if(interpretationRef.current) {
                        interpretationRef.current.scrollTop = interpretationRef.current.scrollHeight;
                    }
                }

                if (isTtsEnabled && fullResponse.trim().length > 0) {
                    await processSentenceForSpeech(fullResponse);
                }

            } catch(e) {
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
                setError(`Разрыв в ткани ритма: ${errorMessage}`);
                setInterpretation('Связь с потоком была потеряна. Камни молчат.');
            } finally {
                setIsLoading(false);
            }
        }, 1500); // Wait for flip animation
    };

    return (
        <div className="flex flex-col h-full w-full items-center pt-16">
            <h2 className="font-serif text-2xl md:text-3xl text-text mb-6 text-center">Бросок Рун Ритма</h2>
            
            <div className="w-full max-w-2xl mb-8">
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Сосредоточьтесь на своём текущем ритме или вопросе..."
                    disabled={isLoading}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors mb-4"
                />
                <button
                    onClick={handleCast}
                    disabled={isLoading || !question.trim()}
                    className="button-primary w-full !py-3 text-md"
                >
                    {isLoading ? <Loader /> : 'Бросить три руны'}
                </button>
            </div>
            
            {drawnRunes.length > 0 && (
                <div className="mb-8 flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8">
                    {drawnRunes.map((rune, index) => (
                        <div key={index} className="opacity-0 animate-fade-in" style={{ animationDelay: `${index * 0.2}s`}}>
                            <RuneStone rune={rune} isFlipped={areRunesFlipped} />
                        </div>
                    ))}
                </div>
            )}
            
            {(interpretation || (isLoading && areRunesFlipped)) && (
                <div className="w-full max-w-3xl flex-grow bg-surface rounded-lg p-6 overflow-y-auto mb-4" ref={interpretationRef}>
                    <div className="prose prose-invert font-serif text-lg leading-relaxed text-text-muted whitespace-pre-wrap">
                        {interpretation.split('**').map((part, index) => 
                            index % 2 === 1 ? <strong key={index} className="text-accent font-semibold">{part}</strong> : part
                        )}
                        {isLoading && !interpretation && <div className="py-8 flex justify-center"><Loader /></div>}
                        {isLoading && interpretation && (
                            <span className="ml-2 inline-block h-3 w-1 animate-pulse bg-accent"></span>
                        )}
                    </div>
                </div>
            )}
            {error && (
                <div className="absolute bottom-4 right-4 max-w-sm rounded-md bg-danger/80 p-3 text-sm text-white backdrop-blur-md">
                    <p><strong>Ошибка:</strong> {error}</p>
                </div>
             )}
            <style>{`
                .prose strong {
                    color: #4DA3FF; /* text-accent */
                }
            `}</style>
        </div>
    );
};

export default RuneCasting;