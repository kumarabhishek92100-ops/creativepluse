
import React, { useState } from 'react';
import { AppView, AppTheme } from '../types';
import { storage } from '../services/storageService';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, onLogout }) => {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const currentUser = storage.getSession();
  
  const themes: { id: AppTheme, color: string, label: string }[] = [
    { id: 'sanctuary', color: 'bg-[#a7c0a1]', label: 'Soft Sanctuary' },
    { id: 'midnight', color: 'bg-[#1c1f23]', label: 'Midnight Realm' },
    { id: 'cyber', color: 'bg-[#00ff41]', label: 'Cyber Pulse' },
    { id: 'paper', color: 'bg-[#f4ecd8]', label: 'Retro Paper' },
  ];

  const handleThemeChange = (theme: AppTheme) => {
    storage.saveTheme(theme);
    setShowThemeMenu(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-[100] px-6 py-4 flex items-center justify-between bg-[var(--nav-bg)] backdrop-blur-lg border-b border-[var(--border)]">
        <h1 className="font-display text-xl tracking-tight">PULSE</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center border border-[var(--border)] shadow-sm">
            🎨
          </button>
          <button onClick={() => setActiveView('profile')} className="w-8 h-8 rounded-full bg-slate-200 border border-[var(--border)] overflow-hidden">
            <img src={currentUser?.avatar} alt="Profile" />
          </button>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex w-24 lg:w-72 flex-col border-r border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl h-screen sticky top-0 p-6 overflow-hidden">
        <div className="mb-12">
          <div className="bg-[var(--border)] text-white p-6 chunky-card !shadow-none !border-0 rotate-[-2deg] mb-8">
             <h1 className="text-2xl font-display leading-none tracking-tight">PULSE</h1>
          </div>
          
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-full flex items-center space-x-3 p-3 rounded-2xl hover:bg-black/5 transition-all text-[var(--text-main)] font-heading text-xs uppercase"
          >
            <span className="text-lg">🎨</span>
            <span className="hidden lg:block">Realm Shift</span>
          </button>
        </div>
        
        <div className="space-y-4 flex-1">
          <NavItem isActive={activeView === 'feed'} onClick={() => setActiveView('feed')} label="Gallery" icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>} />
          <NavItem isActive={activeView === 'calendar'} onClick={() => setActiveView('calendar')} label="Manifesto" icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z"></path></svg>} />
          <NavItem isActive={activeView === 'discovery'} onClick={() => setActiveView('discovery')} label="Artists" icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>} />
          <NavItem isActive={activeView === 'chat'} onClick={() => setActiveView('chat')} label="Pulse Chat" icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>} />
          <NavItem isActive={activeView === 'room'} onClick={() => setActiveView('room')} label="Workshop" icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>} />
        </div>

        <div className="mt-auto space-y-2">
          <button 
            onClick={() => setActiveView('profile')}
            className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeView === 'profile' ? 'bg-[var(--secondary)] text-white shadow-lg' : 'hover:bg-black/5'}`}
          >
            <img src={currentUser?.avatar} className="w-10 h-10 rounded-full border border-[var(--border)] bg-white" alt="" />
            <div className="hidden lg:block text-left">
              <p className="font-heading text-xs uppercase truncate max-w-[120px]">{currentUser?.name}</p>
              <p className="text-[9px] font-bold opacity-40 uppercase">Artist Sync</p>
            </div>
          </button>
        </div>
      </nav>

      {/* Theme Selection Modal */}
      {showThemeMenu && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setShowThemeMenu(false)}>
          <div className="chunky-card p-8 rounded-[3rem] max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-2xl uppercase mb-6 text-center">Select Realm</h3>
            <div className="grid grid-cols-1 gap-4">
              {themes.map(t => (
                <button 
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className="flex items-center space-x-4 p-4 rounded-2xl border border-[var(--border)] hover:bg-[var(--input-bg)] transition-all text-left group"
                >
                  <div className={`w-8 h-8 rounded-full ${t.color} border border-[var(--border)] group-hover:scale-110 transition-transform`}></div>
                  <span className="font-heading text-sm uppercase">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-screen overflow-y-auto pb-safe md:pb-0">
        {children}
      </main>

      {/* Mobile Floating Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-[var(--nav-bg)] backdrop-blur-2xl border-2 border-[var(--border)] rounded-[2.5rem] p-2 flex items-center justify-between shadow-2xl">
        <MobileNavItem isActive={activeView === 'feed'} onClick={() => setActiveView('feed')} icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>} />
        <MobileNavItem isActive={activeView === 'calendar'} onClick={() => setActiveView('calendar')} icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z"></path></svg>} />
        <div className="relative -top-8">
           <button onClick={() => setActiveView('create')} className="w-16 h-16 chunky-button !rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
           </button>
        </div>
        <MobileNavItem isActive={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>} />
        <MobileNavItem isActive={activeView === 'profile'} onClick={() => setActiveView('profile')} icon={<svg className="w-6 h-6 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>} />
      </nav>
    </div>
  );
};

const NavItem = ({ isActive, onClick, label, icon }: { isActive: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 ${
      isActive 
      ? `bg-[var(--primary)] text-white border-2 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] -translate-y-1 translate-x-1` 
      : 'text-[var(--text-muted)] hover:bg-black/5'
    }`}
  >
    <div className="flex-shrink-0">{icon}</div>
    <span className="hidden lg:block font-heading text-base tracking-wide uppercase">{label}</span>
  </button>
);

const MobileNavItem = ({ isActive, onClick, icon }: { isActive: boolean; onClick: () => void; icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex justify-center p-3 transition-all ${isActive ? 'scale-125' : 'opacity-40'}`}
  >
    {icon}
  </button>
);

export default Layout;
