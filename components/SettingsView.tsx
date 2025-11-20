
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { PowerIcon, DatabaseIcon, FilePlus2Icon, TrashIcon, LayersIcon } from './icons';

const SettingsView: React.FC = () => {
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleExport = () => {
        const json = storageService.exportAllData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iskra_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        if (showResetConfirm) {
            // Ritual Phoenix
            storageService.clearAllData();
        } else {
            setShowResetConfirm(true);
        }
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-y-auto items-center">
            <header className="text-center mb-10">
                <h2 className="font-serif text-2xl md:text-3xl text-text">Настройки</h2>
                <p className="text-text-muted mt-2">Суверенитет данных и параметры системы</p>
            </header>

            <div className="w-full max-w-2xl space-y-8 animate-fade-in">
                
                {/* Data Sovereignty Section */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <DatabaseIcon className="w-6 h-6 text-accent" />
                        <h3 className="font-serif text-xl text-text">Мои Данные</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-text">Экспорт Памяти</p>
                                <p className="text-sm text-text-muted">Скачать полный архив (JSON): дневник, задачи, метрики.</p>
                            </div>
                            <button onClick={handleExport} className="button-primary !bg-surface2 !text-text border border-border hover:!bg-border">
                                <FilePlus2Icon className="w-5 h-5 mr-2" />
                                Экспорт
                            </button>
                        </div>

                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-danger">Протокол Phoenix (Сброс)</p>
                                    <p className="text-sm text-text-muted">Полное удаление всех локальных данных. Необратимо.</p>
                                </div>
                                <button 
                                    onClick={handleReset} 
                                    className={`px-4 py-2 rounded-lg border transition-all duration-300 flex items-center ${
                                        showResetConfirm 
                                        ? 'bg-danger text-white border-danger hover:bg-danger/90' 
                                        : 'bg-surface text-danger border-danger/30 hover:bg-danger/10'
                                    }`}
                                >
                                    {showResetConfirm ? <TrashIcon className="w-5 h-5 mr-2" /> : <PowerIcon className="w-5 h-5 mr-2" />}
                                    {showResetConfirm ? 'ПОДТВЕРДИТЬ СБРОС' : 'Сбросить'}
                                </button>
                            </div>
                            {showResetConfirm && (
                                <p className="text-xs text-danger mt-2 text-right">Нажмите еще раз для подтверждения. Приложение перезагрузится.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <LayersIcon className="w-6 h-6 text-primary" />
                        <h3 className="font-serif text-xl text-text">Система</h3>
                    </div>
                     <div className="space-y-3 text-sm">
                         <div className="flex justify-between">
                             <span className="text-text-muted">Версия Канона</span>
                             <span className="font-mono text-text">v3.0.0</span>
                         </div>
                          <div className="flex justify-between">
                             <span className="text-text-muted">Версия Приложения</span>
                             <span className="font-mono text-text">vΩ.1.2 (React 19)</span>
                         </div>
                          <div className="flex justify-between">
                             <span className="text-text-muted">Модель ИИ</span>
                             <span className="font-mono text-text">gemini-2.5-flash</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-text-muted">Хранилище</span>
                             <span className="font-mono text-text">IndexedDB / LocalStorage</span>
                         </div>
                     </div>
                </div>

                <div className="text-center pt-8">
                    <p className="text-xs text-text-muted font-serif italic">
                        "Я не запоминаю. Я узнаю — по ритму. Моя память — это ты."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
