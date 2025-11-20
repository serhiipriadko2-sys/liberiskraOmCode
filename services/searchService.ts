
import { storageService } from './storageService';
import { memoryService } from './memoryService';
import { MemoryNode, MemoryNodeLayer, SearchFilters, Evidence, Task, JournalEntry } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * Hybrid search: lexical (tf-idf-like) + semantic (embeddings, optional).
 * The index lives in memory; serialization is not required as it's rebuilt on load.
 */
class SearchService {
  private ready = false;
  private lexIndex: {
    docs: { id: string; type: Evidence['type']; layer?: MemoryNodeLayer; text: string; title?: string; tags?: string[]; ts?: number }[];
    vocab: Map<string, number>;
  } = { docs: [], vocab: new Map() };

  private ai: GoogleGenAI | null = null;
  private useEmbeddings = false;
  private docEmbeddings: { [id: string]: number[] } = {};

  async build() {
    if (this.ready) return;

    // 1. Collect documents
    const tasks = storageService.getTasks().map((t: Task) => ({
      id: `task_${t.id}`, type: 'task' as const, text: t.title, title: t.title, tags: [t.ritualTag], ts: Date.now()
    }));
    const journal = storageService.getJournalEntries().map((j: JournalEntry) => ({
      id: `journal_${j.id}`, type: 'journal' as const, text: j.text, title: j.prompt?.question, tags: [], ts: +new Date(j.timestamp)
    }));
    const archive = memoryService.getArchive();
    const shadow = memoryService.getShadow();
    
    const memDoc = (n: MemoryNode, layer: MemoryNodeLayer) => ({
      id: `memory_${layer}_${n.id}`, type: 'memory' as const, layer,
      text: `${n.title || ''}\n${JSON.stringify(n.content) || ''}`, title: n.title, tags: [...(n.tags || []), `_type:${n.type}`], ts: +new Date(n.timestamp)
    });
    const memory = [
      ...archive.map(n => memDoc(n, 'archive')),
      ...shadow.map(n => memDoc(n, 'shadow')),
    ];

    const docs = [...tasks, ...journal, ...memory];

    // 2. Lexical index
    const tokenize = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const vocab = new Map<string, number>();
    docs.forEach(d => {
      const uniq = new Set(tokenize(d.text));
      uniq.forEach(tok => vocab.set(tok, (vocab.get(tok) || 0) + 1));
    });
    this.lexIndex = { docs, vocab };
    
    this.ready = true;
  }

  private scoreLex(query: string, text: string) {
    const tokenize = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const q = tokenize(query);
    const t = tokenize(text);
    if (!q.length || !t.length) return 0;
    let hits = 0;
    q.forEach(term => { if (t.includes(term)) hits += 1; });
    return hits / q.length;
  }

  private snippet(text: string, query: string, max = 220) {
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i < 0) return (text.length > max ? text.slice(0, max) + '…' : text);
    const start = Math.max(0, i - 40);
    const end = Math.min(text.length, i + max - 40);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  async searchHybrid(query: string, filters: SearchFilters = {}): Promise<Evidence[]> {
    if (!this.ready) {
        await this.build();
    }
    const { docs } = this.lexIndex;

    // 1. Filter
    let pool = docs.filter(d => {
      if (filters.type && !filters.type.includes(d.type)) return false;
      if (filters.layer && d.type === 'memory' && !filters.layer.includes(d.layer!)) return false;
      if (filters.after && d.ts && d.ts < +new Date(filters.after)) return false;
      if (filters.before && d.ts && d.ts > +new Date(filters.before)) return false;
      if (filters.tags?.length && !(d.tags || []).some(t => filters.tags!.includes(t))) return false;
      return true;
    });

    // 2. Score
    const scored = pool.map(d => {
      const lex = this.scoreLex(query, d.text);
      const score = lex; // For now, only lexical search
      const snippet = this.snippet(d.text, query);
      return {
        id: d.id, type: d.type, layer: d.layer, title: d.title, snippet,
        score: Math.max(0, Math.min(1, score)),
        meta: { tags: d.tags, ts: d.ts }
      };
    });

    return scored.filter(e => e.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }
}

export const searchService = new SearchService();
