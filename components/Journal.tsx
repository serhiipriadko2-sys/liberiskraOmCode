
import React, { useState, useEffect } from 'react';
import { IskraAIService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { JournalPrompt, JournalEntry } from '../types';
import Loader from './Loader';
import { SparkleIcon, XIcon, ChevronRightIcon, Undo2Icon, PowerIcon } from './icons';

const service = new IskraAIService();

const LockScreen: React.FC<{ onUnlock: () => void; storedPin: string }> = ({ onUnlock, storedPin }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    const handleNumber = (num: string) => {
        if (input.length < 4) {
            const newVal = input + num;
            setInput(newVal);
            setError(false);
            if (newVal.length === 4) {
                if (newVal === storedPin) {
                    onUnlock();
                } else {
                    setError(true);
                    setTimeout(() => setInput(''), 500);
                }
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4 shadow-glow-ember">
                    <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-xl font-serif text-text">Дневник защищён</h3>
                <p className="text-text-muted text-sm mt-2">Введите PIN-код для доступа</p>
            </div>
            
            <div className="flex gap-4 mb-8 h-4">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < input.length ? (error ? 'bg-danger' : 'bg-primary') : 'bg-surface2 border border-border'}`} />
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumber(num.toString())}
                        className="w-16 h-16 rounded-full bg-surface border border-border text-xl font-mono text-text hover:bg-surface2 hover:border-primary/50 transition-all active:scale-95"
                    >
                        {num}
                    </button>
                ))}
                <div />
                <button
                     onClick={() => handleNumber('0')}
                     className="w-16 h-16 rounded-full bg-surface border border-border text-xl font-mono text-text hover:bg-surface2 hover:border-primary/50 transition-all active:scale-95"
                >
                    0
                </button>
                <button onClick={() => setInput(prev => prev.slice(0, -1))} className="w-16 h-16 flex items-center justify-center text-text-muted hover:text-text">
                     ⌫
                </button>
            </div>
        </div>
    );
};

const SetupPin: React.FC<{ onSet: (pin: string) => void; onCancel: () => void }> = ({ onSet, onCancel }) => {
     const [input, setInput] = useState('');
     const [confirm, setConfirm] = useState('');
     const [step, setStep] = useState<'create'|'confirm'>('create');
     const [error, setError] = useState<string|null>(null);

     const handleNumber = (num: string) => {
        const currentVal = step === 'create' ? input : confirm;
        if (currentVal.length < 4) {
            const newVal = currentVal + num;
            if (step === 'create') setInput(newVal);
            else setConfirm(newVal);
            
            if (newVal.length === 4) {
                if (step === 'create') {
                    setTimeout(() => setStep('confirm'), 300);
                } else {
                    if (input === newVal) {
                        onSet(input);
                    } else {
                        setError('Коды не совпадают');
                        setTimeout(() => {
                            setConfirm('');
                            setStep('create');
                            setInput('');
                            setError(null);
                        }, 1000);
                    }
                }
            }
        }
    };

    return (
         <div className="flex flex-col items-center justify-center h-full animate-fade-in relative">
             <button onClick={onCancel} className="absolute top-0 right-0 p-2 text-text-muted hover:text-text">Отмена</button>
             <h3 className="text-xl font-serif text-text mb-2">{step === 'create' ? 'Создайте PIN-код' : 'Подтвердите PIN-код'}</h3>
             {error && <p className="text-danger text-sm mb-4">{error}</p>}
             
              <div className="flex gap-4 mb-8 h-4">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < (step === 'create' ? input.length : confirm.length) ? 'bg-accent' : 'bg-surface2 border border-border'}`} />
                ))}
            </div>

             <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumber(num.toString())}
                        className={`w-16 h-16 rounded-full bg-surface border border-border text-xl font-mono text-text hover:bg-surface2 hover:border-accent/50 transition-all active:scale-95 ${num === 0 ? 'col-start-2' : ''}`}
                    >
                        {num}
                    </button>
                ))}
             </div>
         </div>
    )
}


const Journal: React.FC = () => {
    const [prompt, setPrompt] = useState<JournalPrompt | null>(null);
    const [entryText, setEntryText] = useState('');
    const [savedEntries, setSavedEntries] = useState<JournalEntry[]>([]);
    const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPromptLoading, setIsPromptLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Security State
    const [isLocked, setIsLocked] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [storedPin, setStoredPin] = useState<string | null>(null);

    const fetchInitialData = async () => {
        setIsLoading(true);
        setIsPromptLoading(true);
        setError(null);
        
        // Check Security
        const pin = storageService.getJournalPin();
        if (pin) {
            setStoredPin(pin);
            setHasPin(true);
            setIsLocked(true);
        }

        try {
            setSavedEntries(storageService.getJournalEntries());
            const result = await service.getJournalPrompt();
            setPrompt(result);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(`Failed to get a journal prompt: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setIsPromptLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleNewPrompt = async () => {
        if (isPromptLoading) return;
        setIsPromptLoading(true);
        setError(null);
        try {
            const result = await service.getJournalPrompt();
            setPrompt(result);
            setEntryText(''); 
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(`Failed to get a new journal prompt: ${errorMessage}`);
        } finally {
            setIsPromptLoading(false);
        }
    };

    const handleSave = () => {
        if (!entryText.trim() || !prompt) return;
        setIsSaving(true);
        
        const newEntry: JournalEntry = {
            id: `entry-${Date.now()}`,
            timestamp: new Date().toISOString(),
            text: entryText,
            prompt: prompt,
        };
        
        storageService.addJournalEntry(newEntry);
        setSavedEntries(storageService.getJournalEntries());
        
        setTimeout(() => {
            setIsSaving(false);
            setEntryText('');
        }, 1000);
    };
    
    const handleSetPin = (pin: string) => {
        storageService.saveJournalPin(pin);
        setStoredPin(pin);
        setHasPin(true);
        setIsSettingPin(false);
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    if (isLocked && storedPin) {
        return <LockScreen storedPin={storedPin} onUnlock={() => setIsLocked(false)} />;
    }

    if (isSettingPin) {
        return <SetupPin onSet={handleSetPin} onCancel={() => setIsSettingPin(false)} />;
    }

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
            <div className="relative mb-6 shrink-0">
                <h2 className="font-serif text-2xl md:text-3xl text-text text-center">Дневник</h2>
                <div className="absolute top-1/2 -translate-y-1/2 right-0">
                    {!hasPin ? (
                        <button onClick={() => setIsSettingPin(true)} className="text-xs bg-surface2 hover:bg-border px-3 py-1.5 rounded-md transition-colors text-text-muted hover:text-accent">
                            Установить PIN
                        </button>
                    ) : (
                         <button onClick={() => setIsLocked(true)} className="text-text-muted hover:text-primary transition-colors p-1" title="Заблокировать">
                            <span className="text-lg">🔒</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-hidden">
                {/* Editor Column */}
                <div className="flex flex-col h-full">
                    {(isLoading && !prompt) && (
                        <div className="m-auto flex flex-col items-center justify-center h-full">
                            <Loader />
                            <p className="mt-4 text-accent">Искра ищет для вас вопрос...</p>
                        </div>
                    )}
                    {error && (
                        <div className="m-auto text-center p-4 rounded-lg bg-danger/20">
                            <p className="text-danger">{error}</p>
                        </div>
                    )}
                    {prompt && (
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="mb-4 p-4 border border-border rounded-lg bg-surface shrink-0">
                                <div className="flex items-start space-x-3">
                                    <SparkleIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <h3 className="font-serif text-xl text-text">{prompt.question}</h3>
                                        <p className="text-sm text-text-muted mt-1 italic">Почему это? {prompt.why}</p>
                                    </div>
                                    <button
                                        onClick={handleNewPrompt}
                                        disabled={isPromptLoading}
                                        className="p-2 rounded-full text-text-muted hover:bg-surface2 hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                        title="Сгенерировать другой вопрос"
                                    >
                                        {isPromptLoading ? <Loader /> : <Undo2Icon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={entryText}
                                onChange={(e) => setEntryText(e.target.value)}
                                placeholder="Напишите свои мысли здесь..."
                                className="w-full h-full flex-grow resize-none rounded-lg border border-border bg-surface p-4 text-text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                            />
                             <button
                                onClick={handleSave}
                                disabled={isSaving || !entryText.trim()}
                                className="button-primary w-full mt-4 !py-3 text-md"
                            >
                                {isSaving ? 'Сохранение...' : 'Сохранить запись'}
                            </button>
                        </div>
                    )}
                </div>
                {/* Archive Column */}
                <div className="flex flex-col h-full overflow-hidden">
                     <h3 className="font-serif text-xl text-text mb-4 text-center lg:text-left">Архив</h3>
                     <div className="flex-grow overflow-y-auto pr-2 -mr-2 border-t border-border lg:border-t-0 lg:border-l lg:pl-6">
                        {savedEntries.length === 0 && !isLoading ? (
                            <div className="text-center py-10 text-text-muted">Ваш архив дневника пуст.</div>
                        ) : (
                            <ul className="space-y-3 pt-4 lg:pt-0">
                                {savedEntries.map(entry => (
                                    <li key={entry.id}>
                                        <button onClick={() => setViewingEntry(entry)} className="w-full text-left p-3 bg-surface rounded-lg hover:bg-surface2 transition-colors flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-text">{formatDate(entry.timestamp)}</p>
                                                <p className="text-sm text-text-muted italic truncate">"{entry.prompt.question}"</p>
                                            </div>
                                            <ChevronRightIcon className="w-5 h-5 text-text-muted" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>
                </div>
            </div>

            {/* View Entry Modal */}
            {viewingEntry && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setViewingEntry(null)}>
                    <div className="w-full max-w-2xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-serif text-2xl text-text">{formatDate(viewingEntry.timestamp)}</h3>
                                <p className="text-sm text-accent italic">Вопрос: {viewingEntry.prompt.question}</p>
                            </div>
                            <button onClick={() => setViewingEntry(null)} className="text-text-muted hover:text-text">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                           <p className="text-text-muted whitespace-pre-wrap leading-relaxed">{viewingEntry.text}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Journal;
