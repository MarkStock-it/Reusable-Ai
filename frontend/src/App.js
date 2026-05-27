import React, { useState, useEffect } from 'react';
import '@/App.css';
import ModeSwitcher from './components/ModeSwitcher';
import SessionList from './components/SessionList';
import ChatCanvas from './components/ChatCanvas';
import SettingsDrawer from './components/SettingsDrawer';
import APIStatusBar from './components/APIStatusBar';
import { useSessionStore } from './stores/sessionStore';
import { useKeysStore } from './stores/keysStore';
import { Settings, Download } from 'lucide-react';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { currentSession, exportSession } = useSessionStore();
  const { fetchKeys } = useKeysStore();

  useEffect(() => {
    // Fetch keys on mount
    fetchKeys();
  }, [fetchKeys]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" data-testid="app-container">
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div 
          className="w-[260px] bg-surface border-r border-white/5 flex flex-col"
          data-testid="left-sidebar"
        >
          {/* Logo / Header */}
          <div className="p-6 border-b border-white/5">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              NEXUS
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Multi-Provider AI Hub
            </p>
          </div>

          {/* Mode Switcher */}
          <ModeSwitcher />

          {/* Session List */}
          <SessionList />

          {/* Settings Button */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={() => setShowSettings(true)}
              data-testid="open-settings-button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-elevated transition-all text-text-secondary hover:text-text-primary"
            >
              <Settings size={18} />
              <span className="text-sm">API Keys</span>
            </button>
            
            {currentSession && (
              <button
                onClick={() => exportSession(currentSession.id, 'md')}
                data-testid="export-conversation-button"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mt-2
                  hover:bg-elevated transition-all text-text-secondary hover:text-text-primary"
              >
                <Download size={18} />
                <span className="text-sm">Export Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatCanvas />
        </div>
      </div>

      {/* Status Bar */}
      <APIStatusBar />

      {/* Settings Drawer */}
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
