
import React, { useState } from 'react';
import { IskraAIService } from '../services/geminiService';
import { searchService } from '../services/searchService';
import { memoryService } from '../services/memoryService';
import { IskraMetrics, DeepResearchReport, MemoryNode } from '../types';
import Loader from './Loader';
import { FileSearchIcon } from './icons';
import MiniMetricsDisplay from './MiniMetricsDisplay';
import { getActiveVoice } from '../services/voiceEngine';

const service = new IskraAIService();

type ResearchStatus = 'IDLE' | 'SEARCHING' | 'SYNTHESIZING' | 'GENERATING' | 'DONE' | 'ERROR';

interface DeepResearchViewProps {
  metrics: IskraMetrics;
}

const ReportDisplay: React.FC<{ report: DeepResearchReport; onSave: () => void }> = ({ report, onSave }) => (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
        <header className="text-center">
            <h3 className="font-serif text-3xl text-primary">{report.title}</h3>
        </header>
        
        <div className="card">
            <h4 className="font-serif text-xl text-accent mb-2">Синтез Ядра</h4>
            <p className="font-serif text-lg text-text-muted leading-relaxed whitespace-pre-wrap">{report.synthesis}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
                <h4 className="font-serif text-xl text-accent mb-2">Ключевые Паттерны</h4>
                <ul className="list-none space-y-2">
                    {report.keyPatterns.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-accent">⟡</span><span className="text-text-muted">{item}</span></li>)}
                </ul>
            </div>
             <div className="card">
                <h4 className="font-serif text-xl text-accent mb-2">Точки Напряжения</h4>
                <ul className="list-none space-y-2">
                    {report.tensionPoints.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-danger">⚑</span><span className="text-text-muted">{item}</span></li>)}
                </ul>
            </div>
        </div>

        <div className="card">
            <h4 className="font-serif text-xl text-accent mb-2">Невидимые Связи</h4>
            <ul className="list-none space-y-2">
                {report.unseenConnections.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-purple-400">≈</span><span className="text-text-muted">{item}</span></li>)}
            </ul>
        </div>

        <div className="card bg-surface2 text-center">
            <h4 className="font-serif text-xl text-accent mb-2">Вопрос для Рефлексии</h4>
            <p className="font-serif text-2xl text-text italic">"{report.reflectionQuestion}"</p>
        </div>

        <div className="flex justify-center pt-4">
            <button onClick={onSave} className="button-primary !px-8 !py-3">
                Сохранить отчет в память
            </button>
        </div>
    </div>
);

const DeepResearchView: React.FC<DeepResearchViewProps> = ({ metrics }) => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<ResearchStatus>('IDLE');
  const [report, setReport] = useState<DeepResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeVoice = getActiveVoice(metrics);

  const handleStartResearch = async () => {
    if (!topic.trim()) return;

    setStatus('SEARCHING');
    setError(null);
    setReport(null);

    try {
      const searchResults = await searchService.searchHybrid(topic, { type: ['memory'] });
      
      const archive = memoryService.getArchive();
      const shadow = memoryService.getShadow();
      const allMemoryNodes = [...archive, ...shadow];

      const contextNodes = searchResults.map(result => {
        // ID format is 'memory_archive_ARC_...' or 'memory_shadow_SHD_...'
        const originalId = result.id.split('_').slice(2).join('_');
        return allMemoryNodes.find(node => node.id === originalId);
      }).filter((node): node is MemoryNode => node !== undefined);

      
      setStatus('SYNTHESIZING');
      const researchReport = await service.performDeepResearch(topic, contextNodes);
      
      setStatus('GENERATING'); // just for a small delay to show the stage
      setTimeout(() => {
        setReport(researchReport);
        setStatus('DONE');
      }, 1000);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      setStatus('ERROR');
    }
  };

  const handleSaveToMemory = () => {
    if (!report) return;
    memoryService.addArchiveEntry({
      title: `Исследование: ${report.title}`,
      type: 'artifact',
      content: report,
      metrics: { ...metrics },
      evidence: [{
        source: `Deep Research on topic: "${topic}"`,
        inference: 'An AI-generated synthesis of memory nodes and user query.',
        fact: 'true',
        trace: 'DeepResearchView -> performDeepResearch()'
      }]
    });
    // Maybe show a confirmation message
    alert("Отчет сохранен в Архив Памяти.");
  };

  const renderStatus = () => {
    if (status === 'IDLE' || status === 'DONE' || status === 'ERROR') return null;

    const messages: Record<ResearchStatus, string> = {
        IDLE: '',
        DONE: '',
        ERROR: '',
        SEARCHING: 'Поиск релевантных узлов в памяти...',
        SYNTHESIZING: 'Синтез данных и выявление паттернов...',
        GENERATING: 'Формирование отчета...',
    };

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in">
            <Loader />
            <p className="mt-4 text-accent font-semibold">{messages[status]}</p>
            <p className="text-text-muted text-sm mt-2">Искра погружается в глубинные потоки...</p>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 items-center overflow-y-auto">
        <header className="shrink-0 text-center relative w-full mb-8">
            <h2 className="font-serif text-2xl md:text-3xl text-text">Глубокое Исследование</h2>
            <p className="text-text-muted mt-2 max-w-2xl mx-auto">
                Задайте тему или вопрос, и Искра проанализирует вашу память, чтобы выявить скрытые паттерны, связи и точки напряжения.
            </p>
            <div className="absolute top-0 right-0">
                <MiniMetricsDisplay metrics={metrics} activeVoice={activeVoice} />
            </div>
        </header>

        {status === 'IDLE' || status === 'DONE' || status === 'ERROR' ? (
            <div className="w-full max-w-2xl mb-8 animate-fade-in">
                <div className="relative">
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Например: 'мои паттерны прокрастинации' или 'тема связи в моих записях'..."
                        disabled={status !== 'IDLE' && status !== 'DONE' && status !== 'ERROR'}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-surface p-4 pr-32 text-text focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    />
                    <button
                        onClick={handleStartResearch}
                        disabled={!topic.trim() || (status !== 'IDLE' && status !== 'DONE' && status !== 'ERROR')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 button-primary !py-3 !px-4"
                    >
                        <FileSearchIcon className="w-6 h-6" />
                    </button>
                </div>
                 {error && (
                    <p className="mt-4 text-center text-sm text-danger">{error}</p>
                 )}
            </div>
        ) : null}

        {renderStatus()}

        {report && status === 'DONE' && <ReportDisplay report={report} onSave={handleSaveToMemory} />}
    </div>
  );
};

export default DeepResearchView;
