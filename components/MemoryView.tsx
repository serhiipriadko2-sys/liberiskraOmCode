
import React, { useState, useEffect, useMemo } from 'react';
import { memoryService } from '../services/memoryService';
import { searchService } from '../services/searchService';
import { MemoryNode, MemoryNodeType, Evidence } from '../types';
import { SparkleIcon, XIcon } from './icons';
import Loader from './Loader';


const MEMORY_NODE_TYPES: MemoryNodeType[] = ['event', 'feedback', 'decision', 'insight', 'artifact'];

const MemoryView: React.FC = () => {
  const [archive, setArchive] = useState<MemoryNode[]>([]);
  const [shadow, setShadow] = useState<MemoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Evidence[]>([]);
  const [selectedType, setSelectedType] = useState<MemoryNodeType | 'all'>('all');

  useEffect(() => {
    const loadMemory = async () => {
        setIsLoading(true);
        await searchService.build(); // Pre-build index
        setArchive(memoryService.getArchive());
        setShadow(memoryService.getShadow());
        setIsLoading(false);
    }
    loadMemory();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchService.searchHybrid(searchTerm, {
      type: ['memory'],
      tags: selectedType === 'all' ? undefined : [`_type:${selectedType}`],
    });
    setSearchResults(results);
    setIsSearching(false);
  };

  const filteredArchive = useMemo(() => {
    if (selectedType === 'all') return archive;
    return archive.filter(node => node.type === selectedType);
  }, [archive, selectedType]);

  const filteredShadow = useMemo(() => {
    if (selectedType === 'all') return shadow;
    return shadow.filter(node => node.type === selectedType);
  }, [shadow, selectedType]);


  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const NodeCard: React.FC<{ node: MemoryNode }> = ({ node }) => (
    <button
      onClick={() => setSelectedNode(node)}
      className="w-full text-left p-4 bg-surface rounded-lg hover:bg-surface2 transition-colors border border-border animate-fade-in"
    >
      <div className="flex justify-between items-start">
        <p className="font-semibold text-text text-lg font-serif">{node.title}</p>
        <span className={`px-2 py-0.5 text-xs rounded-pill font-mono ${node.layer === 'archive' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'}`}>
          {node.layer}
        </span>
      </div>
      <p className="text-sm text-text-muted mt-1">{node.type}</p>
      <p className="text-xs text-text-muted mt-2">{formatDate(node.timestamp)}</p>
    </button>
  );

  const renderContent = () => {
    if (searchTerm.trim()) {
        if (isSearching) {
            return <div className="text-center p-8"><Loader /></div>;
        }
        if (searchResults.length > 0) {
            return (
                <div className="mt-4 space-y-3">
                    {searchResults.map(r => (
                        <div key={r.id} className="rounded-lg border border-border bg-surface p-3 animate-fade-in">
                            <div className="flex justify-between items-center text-xs opacity-70">
                                <span>{r.type}{r.layer ? `/${r.layer}` : ''}</span>
                                <span className="font-mono">Score: {r.score.toFixed(2)}</span>
                            </div>
                            <div className="font-semibold mt-1 text-text">{r.title || 'Без названия'}</div>
                            <div className="text-sm text-text-muted mt-1 italic">"{r.snippet}"</div>
                        </div>
                    ))}
                </div>
            );
        }
        return <p className="text-text-muted text-center py-8">Ничего не найдено по запросу "{searchTerm}".</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden mt-4">
          <div className="flex flex-col h-full">
            <h3 className="font-serif text-xl text-accent mb-4 text-center md:text-left">Архив (Проверенные узлы)</h3>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
              {filteredArchive.length > 0 ? (
                filteredArchive.map(node => <NodeCard key={node.id} node={node} />)
              ) : (
                <p className="text-text-muted text-center py-8">Архив пуст.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col h-full">
            <h3 className="font-serif text-xl text-purple-400 mb-4 text-center md:text-left">Тень (Гипотезы и паттерны)</h3>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
              {filteredShadow.length > 0 ? (
                 filteredShadow.map(node => <NodeCard key={node.id} node={node} />)
              ) : (
                <p className="text-text-muted text-center py-8">Тень пуста.</p>
              )}
            </div>
          </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
      <header className="shrink-0 text-center mb-6">
        <h2 className="font-serif text-2xl md:text-3xl text-text">Память Искры</h2>
        <div className="mt-4 max-w-2xl mx-auto flex items-center gap-2">
            <input 
                type="text"
                placeholder="Поиск по названию или содержимому..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            />
            <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as any)}
                 className="rounded-lg border border-border bg-surface px-4 py-2 text-text focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            >
                <option value="all">Все типы</option>
                {MEMORY_NODE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
             <button onClick={handleSearch} disabled={isSearching} className="button-primary !py-2 !px-4">
                {isSearching ? '...' : 'Поиск'}
            </button>
        </div>
      </header>

      {isLoading ? (
        <div className="m-auto"><Loader/></div>
      ) : (
        <div className="flex-grow overflow-y-auto">
            {renderContent()}
        </div>
      )}

      {/* Node Detail Modal */}
      {selectedNode && (
         <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setSelectedNode(null)}>
            <div className="w-full max-w-3xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-serif text-2xl text-text">{selectedNode.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-pill font-mono ${selectedNode.layer === 'archive' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'}`}>
                                {selectedNode.layer}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded-pill font-mono bg-border text-text-muted">{selectedNode.type}</span>
                            {selectedNode.facet && <span className="px-2 py-0.5 text-xs rounded-pill font-mono bg-surface text-text-muted">{selectedNode.facet}</span>}
                        </div>
                        <p className="text-xs text-text-muted mt-2">{formatDate(selectedNode.timestamp)}</p>
                    </div>
                     <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-text">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 text-text-muted space-y-4">
                   <div>
                       <h4 className="font-semibold text-text-muted uppercase text-xs tracking-wider mb-2">Содержимое</h4>
                       <pre className="text-sm bg-bg p-3 rounded-md whitespace-pre-wrap font-mono">{JSON.stringify(selectedNode.content, null, 2)}</pre>
                   </div>
                    {selectedNode.metrics && (
                        <div>
                            <h4 className="font-semibold text-text-muted uppercase text-xs tracking-wider mb-2">Метрики в момент записи</h4>
                            <pre className="text-sm bg-bg p-3 rounded-md whitespace-pre-wrap font-mono">{JSON.stringify(selectedNode.metrics, null, 2)}</pre>
                        </div>
                    )}
                     {selectedNode.evidence && selectedNode.evidence.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-text-muted uppercase text-xs tracking-wider mb-2">Опоры (Evidence)</h4>
                             <div className="space-y-2">
                            {selectedNode.evidence.map((ev, i) => (
                                <div key={i} className="text-sm bg-bg p-3 rounded-md">
                                    <p><strong className="text-text-muted/80">Источник:</strong> {ev.source}</p>
                                    <p><strong className="text-text-muted/80">Вывод:</strong> {ev.inference}</p>
                                    <p><strong className="text-text-muted/80">Факт:</strong> {String(ev.fact)}</p>
                                    <p><strong className="text-text-muted/80">След:</strong> {ev.trace}</p>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MemoryView;
