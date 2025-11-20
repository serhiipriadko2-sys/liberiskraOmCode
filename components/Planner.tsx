
import React, { useState, useEffect } from 'react';
import { IskraAIService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Task, RitualTag } from '../types';
import Loader from './Loader';
import { FlameIcon, DropletsIcon, SunIcon, ScaleIcon, TriangleIcon, TrashIcon, ListTodoIcon } from './icons';

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
    WATER: 'text-blue-400', 
    SUN: 'text-warning',
    BALANCE: 'text-success',
    DELTA: 'text-accent',
};

// Simple bar chart component for task distribution
const StatsView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const totalTasks = tasks.length;
    const counts = tasks.reduce((acc, task) => {
        acc[task.ritualTag] = (acc[task.ritualTag] || 0) + 1;
        return acc;
    }, {} as Record<RitualTag, number>);

    const completedCount = tasks.filter(t => t.done).length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-2xl mx-auto w-full pt-4">
            <div className="card flex justify-around items-center py-6">
                 <div className="text-center">
                    <p className="text-sm text-text-muted uppercase tracking-wider">Всего Задач</p>
                    <p className="text-4xl font-serif font-bold text-text mt-1">{totalTasks}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-sm text-text-muted uppercase tracking-wider">Завершено</p>
                    <p className="text-4xl font-serif font-bold text-success mt-1">{completionRate}%</p>
                 </div>
            </div>

            <div className="card">
                <h3 className="font-serif text-xl text-text mb-6">Распределение по Ритмам</h3>
                <div className="space-y-4">
                    {(Object.keys(ritualIcons) as RitualTag[]).map(tag => {
                        const count = counts[tag] || 0;
                        const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                        const Icon = ritualIcons[tag];
                        const color = ritualColors[tag];
                        const bgClass = color.replace('text-', 'bg-');

                        return (
                            <div key={tag} className="flex items-center gap-4">
                                <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
                                <div className="flex-grow">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-text-muted font-medium">{tag}</span>
                                        <span className="text-text font-mono">{count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-surface2 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${bgClass} transition-all duration-1000`} 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const CalendarView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const daysInMonth = 30; // Simulating a standard month for MVP
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const today = new Date().getDate();

    const getTasksForDay = (day: number) => {
        return tasks.filter(t => {
             if (t.date) {
                 return new Date(t.date).getDate() === day;
             }
             return (t.id.charCodeAt(t.id.length - 1) % daysInMonth) + 1 === day;
        });
    };

    return (
        <div className="grid grid-cols-7 gap-2 animate-fade-in">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-xs text-text-muted font-semibold py-2">{d}</div>
            ))}
            {days.map(day => {
                const dayTasks = getTasksForDay(day);
                const isToday = day === today;
                return (
                    <div key={day} className={`min-h-[80px] p-2 rounded-lg border flex flex-col gap-1 ${isToday ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
                        <span className={`text-xs font-mono ${isToday ? 'text-primary font-bold' : 'text-text-muted'}`}>{day}</span>
                        <div className="flex flex-wrap gap-1">
                            {dayTasks.slice(0, 4).map((t, i) => {
                                const colorClass = ritualColors[t.ritualTag].replace('text-', 'bg-');
                                return (
                                    <div key={i} className={`w-2 h-2 rounded-full ${colorClass}`} title={t.title} />
                                );
                            })}
                            {dayTasks.length > 4 && <span className="text-[10px] text-text-muted leading-none">+</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Planner: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'LIST' | 'CALENDAR' | 'STATS'>('LIST');

    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const storedTasks = storageService.getTasks();
                if (storedTasks.length > 0) {
                    setTasks(storedTasks);
                } else {
                    const plan = await service.getPlanTop3();
                    const initialTasks: Task[] = plan.tasks.map(t => ({
                        ...t,
                        id: `iskra-${Date.now()}-${Math.random()}`,
                        done: false,
                        date: new Date().toISOString() // Default to today
                    }));
                    setTasks(initialTasks);
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
                setError(`Failed to generate a plan: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };
        loadTasks();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            storageService.saveTasks(tasks);
        }
    }, [tasks, isLoading]);


    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        const newTask: Task = {
            id: `user-${Date.now()}`,
            title: newTaskTitle,
            ritualTag: 'DELTA',
            done: false,
            date: new Date().toISOString()
        };
        setTasks(prevTasks => [newTask, ...prevTasks]);
        setNewTaskTitle('');
    };

    const handleToggleTask = (id: string) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, done: !task.done } : task
            )
        );
    };

    const handleDeleteTask = (id: string) => {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    };

    const renderTaskItem = (task: Task) => {
        const Icon = ritualIcons[task.ritualTag];
        const color = ritualColors[task.ritualTag];

        return (
            <li key={task.id} className="flex items-center justify-between p-3 bg-surface rounded-lg animate-fade-in group">
                <div className="flex items-center space-x-4">
                     <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                            task.done ? 'bg-accent border-accent' : 'border-border group-hover:border-accent'
                        }`}
                        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
                    >
                        {task.done && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                    <span className={`text-text ${task.done ? 'line-through text-text-muted' : ''}`}>{task.title}</span>
                </div>
                 <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity"
                    aria-label="Delete task"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </li>
        )
    }

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
            <header className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="font-serif text-2xl md:text-3xl text-text text-center flex-grow">Планировщик</h2>
                <div className="flex bg-surface rounded-lg p-1 border border-border">
                    <button 
                        onClick={() => setView('LIST')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === 'LIST' ? 'bg-surface2 text-accent shadow-sm' : 'text-text-muted hover:text-text'}`}
                    >
                        Список
                    </button>
                    <button 
                        onClick={() => setView('CALENDAR')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === 'CALENDAR' ? 'bg-surface2 text-accent shadow-sm' : 'text-text-muted hover:text-text'}`}
                    >
                        Календарь
                    </button>
                     <button 
                        onClick={() => setView('STATS')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === 'STATS' ? 'bg-surface2 text-accent shadow-sm' : 'text-text-muted hover:text-text'}`}
                    >
                        Анализ
                    </button>
                </div>
            </header>
            
            {view === 'LIST' && (
                <form onSubmit={handleAddTask} className="mb-6 shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Добавьте новое намерение..."
                            className="w-full rounded-lg border border-border bg-surface p-3 pr-28 text-text focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-primary/50"
                            disabled={!newTaskTitle.trim()}
                        >
                            Добавить
                        </button>
                    </div>
                </form>
            )}
            
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader />
                        <p className="mt-4 text-accent">Искра готовит ваши точки фокуса...</p>
                    </div>
                )}

                {error && (
                    <div className="m-auto text-center p-4 rounded-lg bg-danger/20">
                        <p className="text-danger">{error}</p>
                    </div>
                )}
                
                {!isLoading && !error && (
                    <>
                        {view === 'LIST' && (
                            <ul className="space-y-3">
                                {tasks.filter(t => !t.done).map(renderTaskItem)}
                                {tasks.filter(t => t.done).length > 0 && (
                                    <li className="pt-4 mt-4 border-t border-border">
                                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Завершено</h3>
                                    </li>
                                )}
                                {tasks.filter(t => t.done).map(renderTaskItem)}
                                {tasks.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-text-muted">Ваш план чист.</p>
                                        <p className="text-text-muted text-sm">Добавьте новую задачу или позвольте Искре предложить Топ-3.</p>
                                    </div>
                                )}
                            </ul>
                        )}
                        {view === 'CALENDAR' && <CalendarView tasks={tasks} />}
                        {view === 'STATS' && <StatsView tasks={tasks} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default Planner;
