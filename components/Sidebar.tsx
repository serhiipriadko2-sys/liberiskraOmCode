
import React from 'react';
import { AppView } from '../App';
import { PulseIcon, ListTodoIcon, BookTextIcon, UsersIcon, MicIcon, SparkleIcon, BrainCircuitIcon, MessageCircleIcon, LayersIcon, DatabaseIcon, FileSearchIcon, BeaconIcon, MenuIcon, XIcon } from './icons';

interface SidebarProps {
  activeView: AppView;
  setView: (view: AppView) => void;
  compact?: boolean;
  mobile?: boolean;
  onOpenMenu?: () => void;
}

// Reordered NAV_ITEMS to prioritize Chat in the 5 slots
const NAV_ITEMS = [
  { id: 'PULSE', name: 'Пульс', icon: PulseIcon },
  { id: 'PLANNER', name: 'План', icon: ListTodoIcon },
  { id: 'CHAT', name: 'Чат', icon: MessageCircleIcon },
  { id: 'JOURNAL', name: 'Дневник', icon: BookTextIcon },
  { id: 'BEACON', name: 'Маяк', icon: BeaconIcon },
] as const;

// Items accessible via "More" or desktop sidebar
const SECONDARY_ITEMS = [
    { id: 'DUO', name: 'Связь', icon: UsersIcon },
    { id: 'LIVE', name: 'Голос', icon: MicIcon },
    { id: 'RUNES', name: 'Руны', icon: SparkleIcon },
    { id: 'RESEARCH', name: 'Поиск', icon: FileSearchIcon },
    { id: 'MEMORY', name: 'Память', icon: DatabaseIcon },
    { id: 'METRICS', name: 'Ядро', icon: BrainCircuitIcon },
    { id: 'SETTINGS', name: 'Настройки', icon: LayersIcon },
] as const;

export const MobileMenu: React.FC<{
    isOpen: boolean;
    activeView: AppView;
    onNavigate: (view: AppView) => void;
    onClose: () => void;
}> = ({ isOpen, activeView, onNavigate, onClose }) => {
    if (!isOpen) return null;

    const remainingNavItems = NAV_ITEMS.slice(4);
    const menuItems = [...remainingNavItems, ...SECONDARY_ITEMS];

    return (
        <div className="fixed inset-0 bg-bg/98 backdrop-blur-2xl z-[100] flex flex-col animate-fade-in touch-none">
            <div className="flex justify-between items-center p-6 pt-safe border-b border-white/5">
                <h2 className="font-serif text-3xl text-text">Меню</h2>
                <button 
                    onClick={onClose} 
                    className="p-3 rounded-full bg-surface2 text-text border border-white/10 hover:bg-border transition-colors active:scale-95"
                >
                    <XIcon className="w-6 h-6" />
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 overflow-y-auto p-4 pb-safe flex-grow content-start">
                 {menuItems.map((item) => (
                     <button
                        key={item.id}
                        onClick={() => onNavigate(item.id as AppView)}
                        className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 active:scale-98 min-h-[110px] ${
                            activeView === item.id 
                            ? 'bg-primary/10 border-primary text-primary shadow-glow-ember' 
                            : 'bg-surface border-white/5 text-text-muted hover:bg-surface2 hover:border-white/10'
                        }`}
                     >
                         <item.icon className="h-8 w-8 mb-3" />
                         <span className="font-medium text-sm">{item.name}</span>
                     </button>
                 ))}
            </div>
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, compact = false, mobile = false, onOpenMenu }) => {
  
  const handleItemClick = (id: AppView) => {
     setView(id);
  }

  const renderItem = (item: any, isMobileRender = false) => {
      const isActive = activeView === item.id;
      
      if (isMobileRender) {
          return (
            <button
                key={item.id}
                onClick={() => handleItemClick(item.id as AppView)}
                className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 active:scale-95 ${
                    isActive ? 'text-primary' : 'text-text-muted/80'
                }`}
            >
                {isActive && (
                    <div className="absolute -top-2 w-12 h-8 bg-primary/10 blur-xl rounded-full" />
                )}
                <item.icon className={`h-6 w-6 mb-1 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-glow-primary' : ''}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.name}</span>
            </button>
          )
      }

      return (
        <button
            key={item.id}
            onClick={() => setView(item.id as AppView)}
            className={`group flex items-center w-full p-3 mb-1 rounded-xl transition-all duration-200 relative overflow-hidden ${
                isActive
                ? 'bg-primary/10 text-primary shadow-glow-ember'
                : 'text-text-muted hover:bg-white/5 hover:text-text'
            }`}
            title={compact ? item.name : undefined}
        >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
            <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${compact ? 'mx-auto' : 'mr-3'}`} />
            
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 origin-left ${
                compact ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-3' : 'opacity-100'
            }`}>
                {item.name}
            </span>
        </button>
      );
  };

  if (mobile) {
      // Take first 4 items for bottom nav + Menu button
      const mobileMainItems = NAV_ITEMS.slice(0, 4);

      return (
          <>
            {/* Bottom Bar Icons */}
            {mobileMainItems.map(item => renderItem(item, true))}
            
            <button
                onClick={onOpenMenu}
                className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 active:scale-95 text-text-muted/80`}
            >
                 <MenuIcon className="h-6 w-6 mb-1" />
                 <span className="text-[10px] font-medium">Ещё</span>
            </button>
          </>
      )
  }

  return (
    <div className="flex flex-col h-full w-full">
        <div className="flex-grow py-4 px-2">
            <nav className="flex flex-col">
                {NAV_ITEMS.map(item => renderItem(item))}
            </nav>

            <div className="my-4 border-t border-white/5 mx-2" />

            <nav className="flex flex-col">
                {SECONDARY_ITEMS.map(item => renderItem(item))}
            </nav>
        </div>
    </div>
  );
};

export default Sidebar;
