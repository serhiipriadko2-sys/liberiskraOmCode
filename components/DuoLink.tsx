
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { DuoSharePrefs, ShareLevel, DuoMessage } from '../types';
import { PulseIcon, SunIcon, ListTodoIcon } from './icons';
import DuoCanvas from './DuoCanvas';

// Mock data for demonstration
const mockPartnerData = {
    name: 'Анна',
    deltaScore: 88,
    sleep: '7.8h (avg)',
};

const initialChatHistory: DuoMessage[] = [
    {id: '1', sender: 'partner', text: 'Как прошел день? 😊', timestamp: '20:15'},
    {id: '2', sender: 'me', text: 'Отлично! Закончил большой проект. Ты как? 🤗', timestamp: '20:16'},
    {id: '3', sender: 'partner', text: 'Тоже хорошо, давай вечером посмотрим фильм?', timestamp: '20:18'},
];

interface ShareControlProps {
    label: string;
    value: ShareLevel;
    onChange: (level: ShareLevel) => void;
    icon: React.FC<any>;
}

const ShareControl: React.FC<ShareControlProps> = ({ label, value, onChange, icon: Icon }) => {
    const levels: { id: ShareLevel; name: string }[] = [
        { id: 'hidden', name: 'Скрыто' },
        { id: 'daily_score', name: 'Дневной Score' },
        { id: 'weekly_mean', name: 'Недельное Среднее' }
    ];
    return (
        <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
            <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-accent" />
                <span className="font-semibold text-text">{label}</span>
            </div>
            <div className="flex items-center space-x-2 rounded-pill bg-bg p-1">
                {levels.map(level => (
                    <button
                        key={level.id}
                        onClick={() => onChange(level.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-pill transition-colors ${
                            value === level.id ? 'bg-primary text-black' : 'text-text-muted hover:bg-surface2'
                        }`}
                    >
                        {level.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const DuoLink: React.FC = () => {
    const [prefs, setPrefs] = useState<DuoSharePrefs>({ sleep: 'hidden', focus: 'hidden', habits: 'hidden' });
    const [chatHistory, setChatHistory] = useState<DuoMessage[]>(initialChatHistory);
    const [chatInput, setChatInput] = useState('');
    const [isCanvasOpen, setIsCanvasOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPrefs(storageService.getDuoPrefs());
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handlePrefChange = (key: keyof DuoSharePrefs, value: ShareLevel) => {
        const newPrefs = { ...prefs, [key]: value };
        setPrefs(newPrefs);
        storageService.saveDuoPrefs(newPrefs);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const newMessage: DuoMessage = {
            id: `msg-${Date.now()}`,
            sender: 'me',
            text: chatInput.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatHistory(prev => [...prev, newMessage]);
        setChatInput('');

        // Simulate reply
        setTimeout(() => {
            const reply: DuoMessage = {
                id: `msg-${Date.now() + 1}`,
                sender: 'partner',
                text: '❤️',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
             setChatHistory(prev => [...prev, reply]);
        }, 2000);
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-y-auto">
            <h2 className="font-serif text-2xl md:text-3xl text-text mb-6 text-center shrink-0">Связь двоих</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow animate-fade-in">
                {/* Left Column: Shared State & Privacy */}
                <div className="space-y-6">
                    {/* Shared Rhythm */}
                    <div>
                        <h3 className="font-serif text-xl text-text mb-4">Общий Ритм: {mockPartnerData.name}</h3>
                        <div className="card flex items-center justify-around p-4">
                            <div className="text-center">
                                <p className="text-sm text-accent">∆-Score</p>
                                <p className="font-serif text-4xl text-text">{mockPartnerData.deltaScore}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-accent">Сон</p>
                                <p className="font-serif text-4xl text-text">{mockPartnerData.sleep}</p>
                            </div>
                        </div>
                    </div>

                    {/* Granular Privacy */}
                    <div>
                        <h3 className="font-serif text-xl text-text mb-4">Настройки Приватности</h3>
                        <div className="space-y-3">
                           <ShareControl label="Сон" value={prefs.sleep} onChange={(v) => handlePrefChange('sleep', v)} icon={SunIcon} />
                           <ShareControl label="Фокус" value={prefs.focus} onChange={(v) => handlePrefChange('focus', v)} icon={PulseIcon} />
                           <ShareControl label="Привычки" value={prefs.habits} onChange={(v) => handlePrefChange('habits', v)} icon={ListTodoIcon} />
                        </div>
                        <p className="text-xs text-text-muted mt-4 italic">Ваши настройки сохраняются автоматически. Партнёр видит только те данные, которыми вы разрешили делиться.</p>
                    </div>
                </div>

                {/* Right Column: Communication Space */}
                <div className="flex flex-col space-y-6 h-[500px] lg:h-auto">
                    {/* E2EE Chat */}
                    <div className="flex flex-col h-full card p-0 overflow-hidden">
                        <h3 className="font-serif text-xl text-text p-4 border-b border-border bg-surface2">Чат-ритуал (E2EE)</h3>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-bg/50">
                           {chatHistory.map(msg => (
                                <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                                     {msg.sender === 'partner' && <div className="w-8 h-8 rounded-full bg-accent/30 flex-shrink-0 flex items-center justify-center text-xs font-bold">A</div>}
                                     <div className={`max-w-[80%] rounded-2xl p-3 ${msg.sender === 'me' ? 'bg-primary text-black rounded-br-none' : 'bg-surface2 text-text rounded-bl-none'}`}>
                                         <p className="text-sm">{msg.text}</p>
                                         <p className={`text-[10px] text-right mt-1 ${msg.sender === 'me' ? 'text-black/60' : 'text-text-muted'}`}>{msg.timestamp}</p>
                                     </div>
                                </div>
                           ))}
                           <div ref={chatEndRef} />
                        </div>
                         <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-surface">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Сообщение..."
                                className="w-full rounded-lg border border-border bg-bg p-3 text-sm text-text focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                            />
                        </form>
                    </div>
                     {/* Shared Canvas */}
                     <div className="card text-center p-4">
                        <h3 className="font-serif text-xl text-text mb-2">Общий Canvas</h3>
                        <p className="text-sm text-text-muted mb-4">Пространство для совместных идей и планов.</p>
                        <button
                          onClick={() => setIsCanvasOpen(true)}
                          className="px-4 py-2 text-sm bg-surface2 hover:bg-border rounded-md font-semibold transition-colors border border-border">
                            Открыть Canvas
                        </button>
                    </div>
                </div>
            </div>
            
            {isCanvasOpen && <DuoCanvas onClose={() => setIsCanvasOpen(false)} />}
        </div>
    );
};

export default DuoLink;
