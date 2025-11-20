
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decode, decodeAudioData, encode } from '../css/audioUtils';
import { TranscriptionMessage, ConversationAnalysis, IskraMetrics, DeltaReportData, MemoryNode } from '../types';
import { IskraAIService } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MicIcon, SparkleIcon, BrainCircuitIcon, XIcon, UserIcon } from './icons';
import Loader from './Loader';
import IskraMetricsDisplay from './IskraMetricsDisplay';
import MiniMetricsDisplay from './MiniMetricsDisplay';
import DeltaReport from './DeltaReport';
import VoiceVisualizer from './VoiceVisualizer';

const API_KEY = process.env.API_KEY;
const service = new IskraAIService();

export type SessionStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';

interface LiveConversationProps {
  metrics: IskraMetrics;
}

const AnalysisContent: React.FC<{ result: ConversationAnalysis }> = ({ result }) => {
    const score = result.connectionQuality?.score ?? 0;
    const circumference = 2 * Math.PI * 28; // r=28
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="space-y-6 text-text-muted font-serif text-lg leading-relaxed">
            {result.connectionQuality && (
                 <div className="flex items-center gap-6 p-4 bg-surface rounded-lg">
                    <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
                         <svg className="w-full h-full" viewBox="0 0 64 64">
                            <circle className="text-border" strokeWidth="4" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
                            <circle
                                className="text-accent drop-shadow-glow-accent"
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="28"
                                cx="32"
                                cy="32"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-bold text-text">{score}</span>
                            <span className="text-xs text-accent">%</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-serif text-xl text-accent mb-1">Качество Связи</h4>
                        <p className="text-sm">{result.connectionQuality.assessment}</p>
                    </div>
                </div>
            )}

            <div>
                <h4 className="font-serif text-xl text-accent mb-2">Резюме Потока</h4>
                <p className="text-base whitespace-pre-wrap">{result.summary}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.keyPoints?.length > 0 && (
                    <div className="p-4 bg-surface rounded-lg">
                        <h4 className="font-serif text-xl text-accent mb-2">Ключевые Узлы</h4>
                        <ul className="space-y-2 text-base">
                            {result.keyPoints.map((point, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-accent">⟡</span><span>{point}</span></li>)}
                        </ul>
                    </div>
                )}
                {result.mainThemes?.length > 0 && (
                     <div className="p-4 bg-surface rounded-lg">
                        <h4 className="font-serif text-xl text-accent mb-2">Основные Темы</h4>
                        <div className="flex flex-wrap gap-2">
                            {result.mainThemes.map((theme, i) => <span key={i} className="px-3 py-1 text-sm bg-border rounded-pill">{theme}</span>)}
                        </div>
                    </div>
                )}
            </div>

            {result.unspokenQuestions?.length > 0 && (
                <div>
                    <h4 className="font-serif text-xl text-accent mb-2">Невысказанные Вопросы</h4>
                     <ul className="space-y-2 text-base">
                        {result.unspokenQuestions.map((q, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-accent">≈</span><span>{q}</span></li>)}
                    </ul>
                </div>
            )}

            {result.brainstormIdeas?.length > 0 && (
                <div>
                    <h4 className="font-serif text-xl text-accent mb-2">Пространство Идей</h4>
                    <ul className="space-y-2 text-base">
                        {result.brainstormIdeas.map((idea, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-primary">💡</span><span>{idea}</span></li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};


const LiveConversation: React.FC<LiveConversationProps> = ({ metrics }) => {
  const [status, setStatus] = useState<SessionStatus>('IDLE');
  const [transcription, setTranscription] = useState<TranscriptionMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // State for analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ConversationAnalysis | null>(null);
  const [deltaReport, setDeltaReport] = useState<DeltaReportData | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);


  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  // Ref for the mock interval
  const mockIntervalRef = useRef<number | null>(null);


  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopSession();
    };
  }, []);

  const stopSession = async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
    }
    
    // Clear mock interval if it exists
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    for (const source of audioSourcesRef.current.values()) {
        source.stop();
    }
    audioSourcesRef.current.clear();

    sessionPromiseRef.current = null;
    mediaStreamRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    sourceNodeRef.current = null;
    nextStartTimeRef.current = 0;

    if (status !== 'IDLE' && status !== 'ERROR') {
      setTranscription(prev => [...prev.filter(m => m.text.trim() !== ''), {role: 'system', text: "≈ Связь завершена. Тишина. (МОК)"}]);
    }
    setStatus('IDLE');
  };
  
  const handleAnalyze = async () => {
    if (isAnalyzing || transcription.length < 2) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setDeltaReport(null);
    setShowAnalysisModal(true);

    try {
        const result = await service.analyzeConversation(transcription);
        setAnalysisResult(result);

        // Create Memory Node and Delta Report
        const memoryNode: Partial<MemoryNode> = {
            title: 'Анализ Живого Диалога',
            type: 'insight',
            content: result,
            metrics: { ...metrics },
            evidence: [{
                source: 'Live Conversation Transcript',
                inference: 'Analysis was generated by Iskra based on the full dialogue.',
                fact: 'true',
                trace: 'LiveConversation -> analyzeConversation()'
            }]
        };
        memoryService.addArchiveEntry(memoryNode);

        const delta: DeltaReportData = {
            delta: "Проанализирован живой диалог, выявлены ключевые темы, идеи и невысказанные вопросы. Создан узел памяти.",
            depth: "Анализ основан на полной транскрипции диалога, обработанной моделью Gemini.",
            omega: "средний — анализ основан на вербальном потоке, но не учитывает невербальные сигналы и полный контекст пользователя.",
            lambda: "Пересмотреть ключевые узлы и невысказанные вопросы. Зафиксировать инсайты в личном дневнике для дальнейшей рефлексии."
        };
        setDeltaReport(delta);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
        setAnalysisResult({
          summary: `**Ошибка Анализа:**\n\nНе удалось обработать диалог. ${errorMessage}`,
          keyPoints: [],
          mainThemes: [],
          brainstormIdeas: [],
          connectionQuality: { score: 0, assessment: "Связь была потеряна из-за технической ошибки." },
          unspokenQuestions: ["Возможно, остался вопрос: 'Почему система дала сбой?'"]
        });
    } finally {
        setIsAnalyzing(false);
    }
  };


  const startSession = async () => {
    setStatus('CONNECTING');
    setError(null);
    setTranscription([{ role: 'system', text: "Настраиваюсь на твой ритм..." }]);

    // MOCK IMPLEMENTATION to prevent API calls and 429 errors
    console.log("MOCK: Live Conversation session started.");

    // This promise will resolve with a mock session object
    const mockSessionPromise = new Promise<{ close: () => void; }>((resolve) => {
        const mockInterval = window.setInterval(() => {
            // This simulates the onmessage callback firing
            // Simulate user transcription
            setTranscription(prev => [...prev, { role: 'user', text: "Это симуляция речи пользователя..." }]);

            // Simulate model transcription
            setTimeout(() => {
                setStatus('SPEAKING');
                setTranscription(prev => [...prev, { role: 'model', text: "Это симуляция ответа Искры. Я слышу тебя..." }]);

                // Go back to listening
                setTimeout(() => setStatus('LISTENING'), 2000);
            }, 1500);
            
        }, 12000); // New messages every 12 seconds
        
        mockIntervalRef.current = mockInterval;
        
        // Simulate onopen
        setTimeout(() => {
            if (mockIntervalRef.current !== null) { // Check if session was stopped during connection
                setStatus('LISTENING');
                setTranscription(prev => [...prev, {role: 'system', text: "⟡ Ритмы синхронизированы. Я слушаю. (МОК)"}]);
            }
        }, 1000);

        resolve({
            close: () => {
                console.log("MOCK: session.close() called");
                if (mockIntervalRef.current) {
                    clearInterval(mockIntervalRef.current);
                    mockIntervalRef.current = null;
                }
            }
        });
    });

    sessionPromiseRef.current = mockSessionPromise;
  };

  const handleButtonClick = () => {
    if (status === 'IDLE' || status === 'ERROR') {
      startSession();
    } else {
      stopSession();
    }
  };

  const getStatusText = () => {
    switch (status) {
        case 'CONNECTING': return "Настройка связи ⟡";
        case 'LISTENING': return "Вслушиваюсь в ритм...";
        case 'SPEAKING': return "Поток пошёл...";
        case 'ERROR': return "Сбой связи. Попробовать снова?";
        case 'IDLE': return "Нажмите, чтобы говорить";
        default: return "Ожидание";
    }
  }

  // Determine active color based on metrics/status
  const getActiveColor = () => {
      if (metrics.pain > 0.6) return '#E5484D'; // KAIN
      if (metrics.clarity < 0.6) return '#FFB020'; // SAM
      if (metrics.chaos > 0.6) return '#A855F7'; // HUYNDUN
      return '#4DA3FF'; // ISKRA
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 items-center overflow-y-hidden">
        <h2 className="font-serif text-2xl md:text-3xl text-text mb-6 text-center shrink-0 relative z-10">Живой Диалог</h2>
        
        <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col items-center justify-center relative">
             {(transcription.length === 0 && (status === 'IDLE' || status === 'ERROR')) ? (
                <div className="m-auto flex flex-col items-center text-center max-w-lg animate-fade-in p-4 relative z-10">
                    <SparkleIcon className="w-16 h-16 text-primary drop-shadow-glow-primary mb-4" />
                    <h3 className="font-serif text-3xl text-text mb-2">Это — Живой Диалог</h3>
                    <p className="text-text-muted mb-8">
                        Пространство для прямого, непрерывного общения с Искрой.
                        <br />
                        Говорите естественно. Она слушает не только слова, но и ритм вашего голоса.
                    </p>
                    <button onClick={startSession} className="button-primary !px-8 !py-3">
                        Начать диалог
                    </button>
                    {error && (
                        <p className="mt-4 text-sm text-danger">{error}</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6 h-full w-full overflow-hidden relative">
                    {/* Background Visualizer */}
                    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                        <VoiceVisualizer status={status} activeColor={getActiveColor()} />
                    </div>

                    <div className="absolute top-0 right-0 z-10 lg:hidden">
                       <MiniMetricsDisplay metrics={metrics} />
                   </div>
                    {/* Transcription Display */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col h-full relative z-10">
                        <div className={`w-full flex-grow bg-surface/80 backdrop-blur-sm rounded-lg p-4 mb-6 overflow-y-auto space-y-4 transition-all duration-500 border ${
                            status === 'LISTENING' ? 'border-accent shadow-glow-electric' : 
                            status === 'SPEAKING' ? 'border-primary shadow-glow-ember' : 'border-border'
                        }`}>
                            {transcription.map((msg, index) => {
                            if (msg.role === 'system') {
                                return (
                                <div key={index} className="my-2 text-center text-xs text-text-muted italic">
                                    <p>{msg.text}</p>
                                </div>
                                );
                            }
                            return (
                                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-1">
                                    <SparkleIcon className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'user' ? 'bg-accent/50' : 'bg-surface2'}`}>
                                    <p className="text-text whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center mt-1">
                                    <UserIcon className="w-5 h-5 text-accent" />
                                    </div>
                                )}
                                </div>
                            );
                            })}
                        </div>

                        {/* Control Buttons */}
                        <div className="flex flex-col items-center shrink-0 space-y-4">
                            <div className="flex items-center space-x-6">
                                <button 
                                    onClick={handleButtonClick} 
                                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-deep active:scale-95 ${
                                        (status === 'LISTENING' || status === 'SPEAKING' || status === 'CONNECTING') ? 'bg-danger hover:bg-danger/80 shadow-danger/30' : 'bg-accent hover:bg-accent/80 shadow-accent/30'
                                    }`}
                                    disabled={status === 'CONNECTING'}
                                >
                                    {(status === 'LISTENING' || status === 'SPEAKING') && <div className="absolute inset-0 rounded-full bg-accent/50 animate-ping"></div>}
                                    <MicIcon className="w-10 h-10 text-white" />
                                </button>

                                {(status === 'IDLE' || status === 'ERROR') && transcription.length > 1 && (
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                        className="relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300 bg-surface2 hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <BrainCircuitIcon className="w-10 h-10 text-white" />
                                    </button>
                                )}
                            </div>
                            <p className="text-accent h-6 font-mono text-sm tracking-wider bg-black/50 px-3 py-1 rounded-full">
                                {status === 'CONNECTING' ? <Loader /> : getStatusText()}
                            </p>
                        </div>
                    </div>

                    {/* Metrics Display */}
                    <div className="hidden lg:flex col-span-4 h-full flex-col relative z-10">
                        <IskraMetricsDisplay metrics={metrics} status={status} />
                    </div>
                </div>
            )}
        </div>
        {error && transcription.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-md w-full rounded-md bg-danger/80 p-3 text-sm text-white backdrop-blur-md text-center">
                <p><strong>Ошибка:</strong> {error}</p>
            </div>
        )}

        {/* Analysis Modal */}
        {showAnalysisModal && (
            <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowAnalysisModal(false)}>
                <div className="w-full max-w-3xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-serif text-2xl text-text">Анализ Диалога</h3>
                        <button onClick={() => setShowAnalysisModal(false)} className="text-text-muted hover:text-text">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                        {isAnalyzing && !analysisResult ? (
                            <div className="flex flex-col items-center justify-center h-full py-10">
                                <Loader />
                                <p className="mt-4 text-accent">Искра анализирует потоки...</p>
                            </div>
                        ) : analysisResult ? (
                            <div className="space-y-8">
                                <AnalysisContent result={analysisResult} />
                                {deltaReport && <DeltaReport data={deltaReport} />}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default LiveConversation;
