
export type RitualTag = 'FIRE' | 'WATER' | 'SUN' | 'BALANCE' | 'DELTA';

export interface Task {
  id: string;
  title: string;
  ritualTag: RitualTag;
  done: boolean;
  date?: string; // ISO Date string YYYY-MM-DD
}

export interface Habit {
  id: string;
  title: string;
  streak: number;
  completedToday: boolean;
  ritualTag: RitualTag;
}

export interface JournalEntry {
  id:string;
  timestamp: string;
  text: string;
  prompt: {
    question: string;
    why: string;
  };
}

// Duo Link Types
export type ShareLevel = 'hidden' | 'daily_score' | 'weekly_mean';

export interface DuoSharePrefs {
  sleep: ShareLevel;
  focus: ShareLevel;
  habits: ShareLevel;
}

export interface DuoMessage {
    id: string;
    sender: 'me' | 'partner';
    text: string;
    timestamp: string;
}

// Duo Link Canvas
export interface DuoCanvasNote {
  id: string;
  text: string;
  color: string; // e.g., 'bg-yellow-800/50'
}

export type VoiceName = 'KAIN' | 'PINO' | 'SAM' | 'ANHANTRA' | 'HUYNDUN' | 'ISKRIV' | 'ISKRA' | 'MAKI';
export type IskraPhase = 'CLARITY' | 'DARKNESS' | 'TRANSITION' | 'ECHO' | 'SILENCE';

export interface Voice {
  name: VoiceName;
  symbol: string;
  description: string;
  activation: (metrics: IskraMetrics) => boolean;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  voice?: Voice;
  deltaSignature?: DeltaSignature; // Parsed ∆DΩΛ block
}

// Live Conversation Types
export interface TranscriptionMessage {
  role: 'user' | 'model' | 'system';
  text: string;
}

// New: Defines the structure for Iskra's internal metrics.
export interface IskraMetrics {
  rhythm: number; // 0-100
  trust: number;  // 0-1
  clarity: number;// 0-1
  pain: number;   // 0-1
  drift: number;  // 0-1
  chaos: number;  // 0-1
  echo: number;   // 0-1 (Resonance/Repetition)
  silence_mass: number; // 0-1 (Weight of silence)
  mirror_sync: number; // 0-1 (Derived: alignment)
  interrupt: number; // 0-1
  ctxSwitch: number; // 0-1
}

export interface DeltaSignature {
  delta: string; // ∆
  depth: string; // D
  omega: string; // Ω
  lambda: string; // Λ
}

// AI Service Types
export interface DailyAdvice {
  deltaScore: number;
  sleep: number;
  focus: number;
  habits: number;
  energy: number;
  insight: string;
  why: string;
  microStep: string;
  checks: string[];
}

export interface PlanTop3 {
  tasks: Array<{
    title: string;
    ritualTag: RitualTag;
  }>;
}

export interface JournalPrompt {
  question: string;
  why: string;
}

export interface ConversationAnalysis {
  summary: string;
  keyPoints: string[];
  mainThemes: string[];
  brainstormIdeas: string[];
  connectionQuality: {
    score: number; // 0-100
    assessment: string;
  };
  unspokenQuestions: string[];
}

export interface DeepResearchReport {
  title: string;
  synthesis: string;
  keyPatterns: string[];
  tensionPoints: string[];
  unseenConnections: string[];
  reflectionQuestion: string;
}

// Memory System Types
export interface SIFTBlock {
  source: string;
  inference: string;
  fact: 'true' | 'false' | 'uncertain';
  trace: string;
}

export interface MemoryNodeMetrics {
  trust: number;
  clarity: number;
  pain: number;
  drift: number;
  chaos: number;
}

export type MemoryNodeType = 'event' | 'feedback' | 'decision' | 'insight' | 'artifact';
export type MemoryNodeLayer = 'mantra' | 'archive' | 'shadow';
export type DocType = 'canon' | 'draft' | 'code' | 'log' | 'personal';

export interface MemoryNode {
  id: string;
  type: MemoryNodeType;
  layer: MemoryNodeLayer;
  timestamp: string;
  metrics?: MemoryNodeMetrics;
  facet?: VoiceName;
  evidence: SIFTBlock[];
  content: any;
  title: string;
  // Audit-driven metadata enhancements
  doc_type?: DocType;
  trust_level?: number; // 0.0 to 1.0
  tags?: string[];
  section?: string; // e.g., "Security/SIFT"
}


export interface DeltaReportData {
  delta: string;
  depth: string;
  omega: string;
  lambda: string;
}

// Search Service Types
export type SearchableDocType = 'journal'|'task'|'memory';

export type SearchFilters = {
  type?: SearchableDocType[];
  tags?: string[];
  after?: string;   // ISO Date
  before?: string;  // ISO Date
  layer?: MemoryNodeLayer[];
};

export interface Evidence {
  id: string;
  type: SearchableDocType;
  layer?: MemoryNodeLayer;
  title?: string;
  snippet: string;
  score: number;
  meta?: Record<string, any>;
};
