
import React, { useState, useEffect } from 'react';
import { IskraAIService } from '../services/geminiService';
import { DailyAdvice, Task, RitualTag, Habit } from '../types';
import { storageService } from '../services/storageService';
import Loader from './Loader';
import BreathingExercise from './BreathingExercise';
import { 
    LightbulbIcon, ClockIcon, ChevronRightIcon,
    FlameIcon, DropletsIcon, SunIcon, ScaleIcon, TriangleIcon
} from './icons';

const service = new IskraAIService();

const ritualIcons: Record<RitualTag, React.FC<React.SVGProps<SVGSVGElement>>> = {
    FIRE: FlameIcon,
    WATER: DropletsIcon,
    SUN: SunIcon,
    BALANCE: ScaleIcon,
    DELTA: TriangleIcon,
};

const ritualColors: Record<RitualTag, string> = {
    FIRE: 'text-danger',
    WATER: 'text-accent',
    SUN: 'text-warning',
    BALANCE: 'text-success',
    DELTA: 'text-primary',
};

const MetricRing: React.FC<{
    score: number;
    size: number; // Desired size in px
    stroke: number;
    color: string;
    children?: React.ReactNode;
    className?: string;
}> = ({ score, size, stroke, color, children, className = '' }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg className="w-full h-full transform -rotate-90 drop-shadow-glow-primary" viewBox={`0 0 ${size} ${size}`}>
                {/* Background Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={stroke}
                    fill="transparent"
                    className="text-white/5"
                />
                {/* Progress Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={stroke}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={`${color} transition-all duration-1000 ease-out`}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

const DayPulse: React.FC = () => {
    const [advice, setAdvice] = useState<DailyAdvice | null>(null);
    const [isAdviceLoading, setIsAdviceLoading] = useState<boolean>(true);
    const [topTasks] = useState<Task[]>(() => {
      try {
        const allTasks = storageService.getTasks();
        return allTasks.filter(t => !t.done).slice(0, 3);
      } catch (e) { return []; }
    });
    const [habits, setHabits] = useState<Habit[]>([]);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [showBreathing, setShowBreathing] = useState(false);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setHabits(storageService.getHabits());
        const fetchAdvice = async () => {
            try {
                const result = await service.getDailyAdvice(topTasks);
                setAdvice(result);
            } catch (e) {
                console.error(e);
            } finally {
                setIsAdviceLoading(false);
            }
        };
        fetchAdvice();
    }, []); // eslint-disable-line

    const handleToggleHabit = (id: string) => {
        const updated = habits.map(h => h.id === id ? { ...h, completedToday: !h.completedToday, streak: !h.completedToday ? h.streak + 1 : Math.max(0, h.streak - 1) } : h);
        setHabits(updated);
        storageService.saveHabits(updated);
    };

    const mainScore = advice?.deltaScore ?? 75;
    const isMobile = windowWidth < 1024;
    const ringSize = isMobile ? 220 : 280;

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-full">
                {/* Left Column: The Rhythm Core */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6 lg:space-y-8 animate-fade-in shrink-0">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse-slow pointer-events-none" />
                        
                        <MetricRing score={mainScore} size={ringSize} stroke={isMobile ? 6 : 8} color="text-primary">
                            <div className="flex flex-col items-center text-center z-10">
                                <span className="text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 tracking-tighter">
                                    {Math.round(mainScore)}
                                </span>
                                <span className="text-sm uppercase tracking-[0.3em] text-primary/80 font-mono mt-2">∆-Ритм</span>
                            </div>
                        </MetricRing>
                        
                        {/* Satellites - Desktop: Absolute around ring. 4 Metrics now. */}
                        {!isMobile && (
                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                {/* Top Left: Focus */}
                                <div className="absolute top-4 left-0">
                                    <div className="glass-panel px-3 py-1 rounded-full text-xs font-mono text-accent border-accent/20">Фокус {advice?.focus}%</div>
                                </div>
                                {/* Top Right: Habits */}
                                <div className="absolute top-4 right-0">
                                    <div className="glass-panel px-3 py-1 rounded-full text-xs font-mono text-purple-400 border-purple-400/20">Привычки {advice?.habits}%</div>
                                </div>
                                {/* Bottom Left: Sleep */}
                                <div className="absolute bottom-10 left-0 -translate-x-4">
                                    <div className="glass-panel px-3 py-1 rounded-full text-xs font-mono text-success border-success/20">Сон {advice?.sleep}%</div>
                                </div>
                                {/* Bottom Right: Energy */}
                                <div className="absolute bottom-10 right-0 translate-x-4">
                                    <div className="glass-panel px-3 py-1 rounded-full text-xs font-mono text-warning border-warning/20">Сила {advice?.energy}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile Satellites Row (4 items) */}
                    {isMobile && (
                        <div className="grid grid-cols-4 w-full max-w-sm px-2 gap-2">
                            <div className="flex flex-col items-center glass-card py-2 px-1">
                                <span className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Фокус</span>
                                <span className="text-base font-mono text-accent">{advice?.focus}%</span>
                            </div>
                            <div className="flex flex-col items-center glass-card py-2 px-1">
                                <span className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Сон</span>
                                <span className="text-base font-mono text-success">{advice?.sleep}%</span>
                            </div>
                            <div className="flex flex-col items-center glass-card py-2 px-1">
                                <span className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Сила</span>
                                <span className="text-base font-mono text-warning">{advice?.energy}%</span>
                            </div>
                            <div className="flex flex-col items-center glass-card py-2 px-1">
                                <span className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Прив.</span>
                                <span className="text-base font-mono text-purple-400">{advice?.habits}%</span>
                            </div>
                        </div>
                    )}

                    {/* Insight Card */}
                    <div className="w-full max-w-sm glass-card p-5 lg:p-6 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
                                <LightbulbIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs lg:text-sm font-bold text-text uppercase tracking-wider mb-2">Инсайт Искры</h3>
                                {isAdviceLoading ? <Loader /> : (
                                    <>
                                        <p className="font-serif text-lg italic leading-relaxed text-text/90 mb-3">
                                            "{advice?.insight}"
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                                            <span className="text-primary">Λ</span>
                                            <span>{advice?.microStep}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Action & Context */}
                <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-6 pb-24 lg:pb-4">
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <button className="glass-card p-4 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors group active:scale-98">
                            <ClockIcon className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-sm lg:text-base">Фокус-сессия</span>
                        </button>
                        <button 
                            onClick={() => setShowBreathing(true)}
                            className="glass-card p-4 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors group active:scale-98"
                        >
                            <span className="text-xl text-primary group-hover:scale-110 transition-transform">≈</span>
                            <span className="font-medium text-sm lg:text-base">Дыхание</span>
                        </button>
                    </div>

                    {/* Top 3 Tasks */}
                    <div className="glass-card p-4 lg:p-6">
                        <div className="flex justify-between items-center mb-4 lg:mb-6">
                            <h3 className="font-serif text-xl text-text">Твои 3 на сегодня</h3>
                            <span className="text-[10px] lg:text-xs text-text-muted font-mono border border-white/10 px-2 py-1 rounded-md">ПЛАН</span>
                        </div>
                        <div className="space-y-3">
                            {topTasks.length > 0 ? topTasks.map(task => {
                                const Icon = ritualIcons[task.ritualTag];
                                return (
                                    <div key={task.id} className="flex items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group active:bg-white/10">
                                        <div className={`p-2 rounded-lg bg-black/30 mr-4 ${ritualColors[task.ritualTag]}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-text/90 flex-grow line-clamp-1">{task.title}</span>
                                        <ChevronRightIcon className="w-4 h-4 text-text-muted opacity-50 lg:opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )
                            }) : (
                                <p className="text-text-muted text-sm text-center py-4">План чист. Добавьте задачи в Планировщике.</p>
                            )}
                        </div>
                    </div>

                    {/* Habits Mini */}
                    <div className="glass-card p-4 lg:p-6 flex-grow min-h-[160px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-serif text-xl text-text">Привычки</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {habits.map(habit => (
                                <button 
                                    key={habit.id}
                                    onClick={() => handleToggleHabit(habit.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 active:scale-[0.99] ${
                                        habit.completedToday 
                                        ? 'bg-success/10 border-success/30' 
                                        : 'bg-transparent border-white/5 hover:bg-white/5'
                                    }`}
                                >
                                    <span className={`text-sm ${habit.completedToday ? 'text-text-muted line-through' : 'text-text'}`}>{habit.title}</span>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                        habit.completedToday ? 'bg-success border-success text-black' : 'border-white/20'
                                    }`}>
                                        {habit.completedToday && <span className="text-[10px] font-bold">✓</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
        </div>
    );
};

export default DayPulse;
