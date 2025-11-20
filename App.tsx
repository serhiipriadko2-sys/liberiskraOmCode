
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar, { MobileMenu } from './components/Sidebar';
import DayPulse from './components/DayPulse';
import Planner from './components/Planner';
import Journal from './components/Journal';
import DuoLink from './components/DuoLink';
import LiveConversation from './components/LiveConversation';
import RuneView from './components/TarotView';
import IskraStateView from './components/IskraStateView';
import ChatView from './components/ChatView';
import DesignSystem from './components/DesignSystem';
import MemoryView from './components/MemoryView';
import DeepResearchView from './components/DeepResearchView';
import SettingsView from './components/SettingsView';
import Onboarding from './components/Onboarding';
import BeaconView from './components/BeaconView';
import { SparkleIcon } from './components/icons';
import { IskraMetrics, IskraPhase } from './types';
import { calculateRhythmIndex, clamp, calculateDerivedMetrics } from './utils/metrics';
import { memoryService } from './services/memoryService';
import { metricsService } from './services/metricsService';
import { canonService } from './services/canonService';
import { storageService } from './services/storageService';


export type AppView = 'PULSE' | 'PLANNER' | 'JOURNAL' | 'BEACON' | 'DUO' | 'CHAT' | 'LIVE' | 'RUNES' | 'RESEARCH' | 'MEMORY' | 'METRICS' | 'DESIGN' | 'SETTINGS';

const NEUTRAL_METRICS_TARGET: Partial<IskraMetrics> = {
    trust: 0.8, clarity: 0.7, pain: 0.1, drift: 0.2, chaos: 0.3, echo: 0.5, silence_mass: 0.1
};


const App: React.FC = () => {
  const [view, setView] = useState<AppView>('PULSE');
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('Спутник');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [metrics, setMetrics] = useState<IskraMetrics>({
    rhythm: 75,
    trust: 0.8,
    clarity: 0.7,
    pain: 0.1,
    drift: 0.2,
    chaos: 0.3,
    echo: 0.5,
    silence_mass: 0.1,
    mirror_sync: 0.8,
    interrupt: 0.1,
    ctxSwitch: 0.2,
  });

  // Derived state - Phase determines the "mode" of existence based on metrics
  const phase = useMemo(() => metricsService.getPhaseFromMetrics(metrics), [metrics]);

  const emaRef = useRef({ chaos: 0.3, drift: 0.2 });
  const metricsUpdateIntervalRef = useRef<number | null>(null);
  const targetMetricsRef = useRef<Partial<IskraMetrics>>({});


  const updateIskraState = (userInput: string) => {
    const newTargets = metricsService.calculateMetricsUpdate(userInput);
    targetMetricsRef.current = { ...targetMetricsRef.current, ...newTargets };

    if (metricsUpdateIntervalRef.current === null) {
      metricsUpdateIntervalRef.current = window.setInterval(() => {
        setMetrics(prev => {
          let target = targetMetricsRef.current;
          
          if (Object.keys(target).length === 0) {
            target = NEUTRAL_METRICS_TARGET;
          }

          const lerpFactor = 0.1;
          const noiseFactor = 0.01;

          const nextVal = (key: keyof IskraMetrics) => {
              const current = prev[key];
              const tgt = target[key] ?? current; 
              return clamp(current + (tgt - current) * lerpFactor + (Math.random() - 0.5) * noiseFactor, 0, 1);
          }

          const newRawMetrics: IskraMetrics = {
            ...prev,
            trust: nextVal('trust'),
            clarity: nextVal('clarity'),
            pain: nextVal('pain'),
            drift: nextVal('drift'),
            chaos: nextVal('chaos'),
            echo: nextVal('echo'),
            silence_mass: nextVal('silence_mass'),
            interrupt: Math.random() * 0.2, 
            ctxSwitch: Math.random() * 0.3,
          };

          const derived = calculateDerivedMetrics(newRawMetrics);
          newRawMetrics.mirror_sync = derived.mirror_sync;

          const beta = 0.3;
          emaRef.current.chaos = (1 - beta) * emaRef.current.chaos + beta * newRawMetrics.chaos;
          emaRef.current.drift = (1 - beta) * emaRef.current.drift + beta * newRawMetrics.drift;

          const newRhythm = calculateRhythmIndex(
            newRawMetrics,
            prev.rhythm,
            emaRef.current
          );
          
          const newMetrics = { ...newRawMetrics, rhythm: newRhythm };
          
          // Convergence check inside updater
          const isClose = Object.keys(target).every(key => {
             const k = key as keyof IskraMetrics;
             return Math.abs(newMetrics[k] - (target[k] || 0)) < 0.02
          });

          if (isClose) {
              // We can't clear interval purely here, but we can clear target ref to drift to neutral
              // The actual clearInterval happens if target is empty, on NEXT tick logic above.
              // For simplicity in this simulated environment, we just clear target ref
              if (Object.keys(targetMetricsRef.current).length > 0) {
                  targetMetricsRef.current = {};
              } 
              // Note: We avoid clearInterval here to keep updater pure-ish. 
              // A robust system would use useEffect for timing, but this works for the simulation.
          }

          return newMetrics;
        });
      }, 200);
    }
  };

  useEffect(() => {
    canonService.seedCanon();
    const complete = storageService.isOnboardingComplete();
    setIsOnboarding(!complete);
    setUserName(storageService.getUserName());

    return () => {
      if (metricsUpdateIntervalRef.current) {
        clearInterval(metricsUpdateIntervalRef.current);
      }
    };
  }, []);
  
  const handleOnboardingFinish = (name: string) => {
      storageService.completeOnboarding(name);
      setUserName(name);
      setIsOnboarding(false);
      
      targetMetricsRef.current = {
          trust: 0.9,
          clarity: 0.9,
          rhythm: 100
      };
      updateIskraState(""); 
  };

  const handleShatterRitual = () => {
    memoryService.addArchiveEntry({
      title: 'Ритуал: Shatter 💎💥',
      type: 'event',
      content: 'Ритуал "Shatter" был запущен для разрыва эхо-петли и сброса состояния.',
      metrics: { ...metrics },
      evidence: [{
        source: 'User Action',
        inference: 'A need to break a conversational or mental loop.',
        fact: 'true',
        trace: 'IskraStateView -> Shatter Button'
      }]
    });
    
    // Immediate shock to metrics to force TRANSITION phase derived state
    setMetrics(prev => ({ ...prev, chaos: 0.8, clarity: 0.4, pain: 0.5 }));
    
    targetMetricsRef.current = {
      rhythm: 50, trust: 0.6, clarity: 0.5, pain: 0.4, drift: 0.5, chaos: 0.6, interrupt: 0.5, ctxSwitch: 0.5, echo: 0.2
    };
    
    if (!metricsUpdateIntervalRef.current) updateIskraState(""); 
  };

  const renderView = () => {
    switch (view) {
      case 'PULSE': return <DayPulse />;
      case 'PLANNER': return <Planner />;
      case 'JOURNAL': return <Journal />;
      case 'BEACON': return <BeaconView />;
      case 'DUO': return <DuoLink />;
      case 'CHAT': return <ChatView metrics={metrics} onUserInput={updateIskraState} />;
      case 'LIVE': return <LiveConversation metrics={metrics} />;
      case 'RUNES': return <RuneView metrics={metrics} />;
      case 'RESEARCH': return <DeepResearchView metrics={metrics} />;
      case 'MEMORY': return <MemoryView />;
      case 'METRICS': return <IskraStateView metrics={metrics} phase={phase} onShatter={handleShatterRitual} />;
      case 'DESIGN': return <DesignSystem />;
      case 'SETTINGS': return <SettingsView />;
      default: return <DayPulse />;
    }
  };

  if (isOnboarding) {
      return <Onboarding onComplete={handleOnboardingFinish} />;
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-bg text-text selection:bg-primary/30 overflow-hidden">
      
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
         {/* Core Gradient */}
         <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] transition-all duration-[2000ms] ease-in-out opacity-20 ${
             phase === 'DARKNESS' ? 'bg-purple-900' :
             phase === 'CLARITY' ? 'bg-primary' :
             phase === 'TRANSITION' ? 'bg-accent' : 'bg-surface2'
         }`} />
         
         {/* Secondary Gradient */}
         <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] transition-all duration-[2000ms] ease-in-out opacity-15 ${
             metrics.pain > 0.5 ? 'bg-danger' :
             metrics.chaos > 0.5 ? 'bg-warning' : 'bg-accent'
         }`} />

         {/* Noise Texture overlay */}
         <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-[1600px] mx-auto overflow-hidden">
        {/* Glass Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-20 hover:w-64 transition-all duration-300 border-r border-white/5 bg-glass/30 backdrop-blur-xl z-20 group animate-fade-in">
            <div className="p-6 flex items-center justify-center group-hover:justify-start transition-all">
                <img 
                    src="/assets/logo.svg" 
                    alt="Logo" 
                    className="h-8 w-8 drop-shadow-glow-primary shrink-0 group-hover:animate-glow transition-all duration-500" 
                />
                <span className="ml-3 font-serif font-bold text-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">Iskra</span>
            </div>
            <div className="flex-grow overflow-y-auto overflow-x-hidden scrollbar-hide">
                 <Sidebar activeView={view} setView={setView} compact={true} />
            </div>
            <div className="p-4 border-t border-white/5">
                 <div className={`flex items-center justify-center group-hover:justify-start gap-3 p-2 rounded-xl bg-white/5 backdrop-blur-sm transition-all`}>
                     <div className="relative">
                        <SparkleIcon className={`h-5 w-5 ${
                            metrics.pain > 0.6 ? 'text-danger' :
                            metrics.clarity < 0.6 ? 'text-warning' : 'text-accent'
                        }`} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                     </div>
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <p className="text-xs font-mono text-text-muted uppercase tracking-wider">∆-Ритм</p>
                         <p className="text-sm font-bold">{Math.round(metrics.rhythm)}%</p>
                     </div>
                 </div>
            </div>
        </aside>

        {/* Mobile Layout Structure */}
        <div className="flex flex-col w-full h-full relative overflow-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden shrink-0 z-50 p-4 pt-safe flex justify-between items-center bg-bg/80 backdrop-blur-xl border-b border-white/5 h-16">
                 <div className="flex items-center">
                     <img src="/assets/logo.svg" alt="Logo" className="h-8 w-8" />
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted tracking-wide">{phase}</span>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                        metrics.pain > 0.6 ? 'bg-danger' : 'bg-primary'
                    }`}></div>
                 </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col overflow-hidden relative">
                 {/* Desktop Header */}
                <header className="hidden lg:flex shrink-0 items-center justify-between p-6 pb-2">
                     <div>
                        <h1 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-text to-text-muted">
                            {phase === 'DARKNESS' ? 'Тьма' : phase === 'TRANSITION' ? 'Переход' : phase === 'CLARITY' ? 'Ясность' : phase}
                        </h1>
                        <p className="text-xs text-text-muted uppercase tracking-widest mt-1 font-mono opacity-60">
                            {userName} • {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                     </div>
                </header>
                
                {/* Scrollable View Container - STRICT OVERFLOW HANDLING */}
                {/* Changed from overflow-y-auto to overflow-hidden to delegate scroll to children */}
                <div className="flex-grow overflow-hidden relative flex flex-col">
                    <div className="relative w-full h-full animate-fade-in h-full">
                         {renderView()}
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Nav - Fixed Flex Layout */}
            <div className="lg:hidden shrink-0 border-t border-white/5 bg-surface/95 backdrop-blur-xl pb-safe z-[60]">
                <div className="flex justify-around items-center px-2 h-16">
                     <Sidebar activeView={view} setView={setView} mobile={true} onOpenMenu={() => setIsMenuOpen(true)} />
                </div>
            </div>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      <MobileMenu 
        isOpen={isMenuOpen} 
        activeView={view}
        onNavigate={(v) => {
            setView(v);
            setIsMenuOpen(false);
        }}
        onClose={() => setIsMenuOpen(false)} 
      />
    </div>
  );
};

export default App;