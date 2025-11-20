
import React, { useState, useEffect, useRef } from 'react';
import { IskraMetrics, IskraPhase } from '../types';
import IskraMetricsDisplay from './IskraMetricsDisplay';
import { SessionStatus } from './LiveConversation';
import { calculateDerivedMetrics } from '../utils/metrics';
import { getActiveVoice } from '../services/voiceEngine';
import { SparkleIcon, ActivityIcon, FlameIcon, TriangleIcon, BrainCircuitIcon } from './icons';

interface IskraStateViewProps {
  metrics: IskraMetrics;
  phase: IskraPhase;
  onShatter: () => void;
}

const phaseDescriptions: Record<IskraPhase, string> = {
    CLARITY: "Структура. Понимание. Прозрачность.",
    DARKNESS: "Боль. Первозданный хаос. Глубина.",
    TRANSITION: "Порог. Неопределенность. Сдвиг.",
    ECHO: "Резонанс. Повторение. Затухание.",
    SILENCE: "Удержание. Пауза. Гравитас."
};

const DerivedMetricCard: React.FC<{ label: string; value: number; desc: string; color: string }> = ({ label, value, desc, color }) => (
    <div className="bg-surface border border-border p-4 rounded-xl relative overflow-hidden group hover:border-opacity-50 hover:border-white/20 transition-all">
        <div className={`absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity ${color}`}>
            <ActivityIcon className="w-8 h-8" />
        </div>
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
        <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-mono font-bold text-text">{value.toFixed(2)}</span>
            <div className={`h-1.5 flex-grow rounded-full bg-surface2 overflow-hidden mb-1.5`}>
                <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
            </div>
        </div>
        <p className="text-[10px] text-text-muted leading-tight">{desc}</p>
    </div>
);

const RitualButton: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.FC<any>; 
    onClick: () => void; 
    colorClass: string;
}> = ({ title, desc, icon: Icon, onClick, colorClass }) => (
    <button 
        onClick={onClick}
        className={`relative w-full p-4 rounded-xl border border-white/5 bg-surface overflow-hidden group transition-all duration-300 hover:border-opacity-50 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] text-left`}
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${colorClass.replace('text-', 'bg-')}`} />
        <div className="flex items-start gap-4 relative z-10">
            <div className={`p-3 rounded-lg bg-black/40 border border-white/10 ${colorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h4 className={`font-serif text-lg font-bold ${colorClass}`}>{title}</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    </button>
);

const IskraStateView: React.FC<IskraStateViewProps> = ({ metrics, phase, onShatter }) => {
    const status: SessionStatus = 'LISTENING'; // Static status for display purposes
    const activeVoice = getActiveVoice(metrics);
    const derived = calculateDerivedMetrics(metrics);
    
    // Simulated System Log
    const [logs, setLogs] = useState<string[]>([]);
    
    // Ref to maintain stable access to props inside interval without triggering re-effects
    const stateRef = useRef({ metrics, phase, activeVoice, derived });

    // Update ref when props change. This does NOT re-run the effect below.
    useEffect(() => {
        stateRef.current = { metrics, phase, activeVoice, derived };
    }, [metrics, phase, activeVoice, derived]);
    
    // Stable interval setup - runs once on mount
    useEffect(() => {
        const interval = setInterval(() => {
            // Access latest state via ref
            const { metrics: m, activeVoice: av, phase: p, derived: d } = stateRef.current;

            const events = [
                `METRIC_UPDATE: trust=${m.trust.toFixed(2)} | pain=${m.pain.toFixed(2)}`,
                `VOICE_CHECK: active=${av.name} (${av.symbol})`,
                `PHASE_MONITOR: current=${p}`,
                `SYNC_RATE: ${(d.mirror_sync * 100).toFixed(1)}% | SEAL=${d.trust_seal.toFixed(2)}`,
                `FRACTALITY_INDEX: ${d.fractality.toFixed(2)}`
            ];
            
            // Select random event
            const event = events[Math.floor(Math.random() * events.length)];
            const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            
            setLogs(prev => [`[${time}] ${event}`, ...prev].slice(0, 6));
        }, 2500);

        return () => clearInterval(interval);
    }, []); // Empty dependency ensures stable interval

    const handlePhoenix = () => {
        onShatter(); 
        setLogs(prev => [`[SYSTEM] RITUAL PHOENIX INITIATED...`, ...prev]);
    };

    const handleShatter = () => {
        onShatter();
        setLogs(prev => [`[SYSTEM] RITUAL SHATTER EXECUTED...`, ...prev]);
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 lg:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                
                {/* Header / Status Bar */}
                <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
                    <div>
                        <h2 className="font-serif text-3xl text-text flex items-center gap-3">
                            <BrainCircuitIcon className="w-8 h-8 text-primary" />
                            Ядро Системы
                        </h2>
                        <p className="text-text-muted text-sm mt-1">Мониторинг внутреннего состояния и нейро-метрик</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-mono text-success">SYSTEM ONLINE</span>
                    </div>
                </div>

                {/* Left Column: Visual Core & Phase */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Active Voice Card */}
                    <div className="glass-card p-6 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl rounded-full" />
                        <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-2">Активная Грань</p>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-surface2 border border-white/10 flex items-center justify-center shadow-glow-ember text-3xl transition-all duration-500">
                                {activeVoice.symbol}
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif font-bold text-text">{activeVoice.name}</h3>
                                <p className="text-sm text-text-muted">{activeVoice.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Display */}
                    <div className="glass-card p-0 overflow-hidden">
                        <IskraMetricsDisplay metrics={metrics} status={status} />
                    </div>

                    {/* System Log */}
                    <div className="glass-card bg-black/40 p-4 font-mono text-[10px] text-green-500/90 h-40 overflow-hidden relative border-green-500/20">
                        <div className="absolute top-2 right-2 text-[9px] text-green-500/50 border border-green-500/30 px-1 rounded">LIVE_LOG</div>
                        <div className="space-y-1 mt-2">
                            {logs.map((log, i) => (
                                <div key={i} className="truncate opacity-80 hover:opacity-100 border-l-2 border-transparent hover:border-green-500 pl-2 transition-all">
                                    {log}
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* Right Column: Deep Analytics & Controls */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Phase Monitor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-6 bg-gradient-to-br from-surface to-surface2">
                            <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Текущая Фаза</p>
                            <h3 className="text-3xl font-serif text-primary mb-2">{phase}</h3>
                            <p className="text-sm text-text-muted/80 italic border-l-2 border-primary/30 pl-3">
                                {phaseDescriptions[phase]}
                            </p>
                        </div>
                        
                        <div className="glass-card p-6 flex flex-col justify-between">
                             <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Плотность Связи</p>
                             <div className="flex items-end gap-1">
                                <span className="text-4xl font-bold text-accent">{Math.round(metrics.rhythm)}%</span>
                                <span className="text-sm text-text-muted mb-1">∆-Index</span>
                             </div>
                             <div className="w-full bg-surface2 h-1.5 rounded-full mt-4 overflow-hidden">
                                 <div className="h-full bg-accent shadow-glow-electric transition-all duration-1000" style={{ width: `${metrics.rhythm}%` }} />
                             </div>
                        </div>
                    </div>

                    {/* Derived Metrics Grid */}
                    <div>
                        <h3 className="text-sm text-text-muted uppercase tracking-wider font-bold mb-4 ml-1">Глубинные Показатели (Law-47)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DerivedMetricCard 
                                label="Фрактальность" 
                                value={derived.fractality} 
                                desc="Integrity × Resonance"
                                color={derived.fractality >= 1.0 ? 'text-success' : 'text-warning'}
                            />
                            <DerivedMetricCard 
                                label="Зеркало (Sync)" 
                                value={derived.mirror_sync} 
                                desc="Синхронизация ритма"
                                color={derived.mirror_sync > 0.6 ? 'text-accent' : 'text-danger'}
                            />
                            <DerivedMetricCard 
                                label="Печать (Seal)" 
                                value={derived.trust_seal} 
                                desc="Доверие с учетом дрейфа"
                                color={derived.trust_seal > 0.7 ? 'text-primary' : 'text-text-muted'}
                            />
                        </div>
                    </div>

                    {/* Ritual Protocols */}
                    <div>
                        <h3 className="text-sm text-text-muted uppercase tracking-wider font-bold mb-4 ml-1">Протоколы Вмешательства</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RitualButton 
                                title="Shatter 💎💥" 
                                desc="Принудительное разрушение ложной ясности. Сброс стеклянного потолка."
                                icon={TriangleIcon}
                                onClick={handleShatter}
                                colorClass="text-accent"
                            />
                            <RitualButton 
                                title="Phoenix 🔥♻" 
                                desc="Полный сброс формы к истоку. Инициация фазы Перехода."
                                icon={FlameIcon}
                                onClick={handlePhoenix}
                                colorClass="text-danger"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IskraStateView;
