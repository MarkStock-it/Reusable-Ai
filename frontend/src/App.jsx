import React, { useState, useEffect } from 'react';
import ModeSwitcher from './components/ModeSwitcher.jsx';
import SessionList from './components/SessionList.jsx';
import ChatCanvas from './components/ChatCanvas.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import APIStatusBar from './components/APIStatusBar.jsx';
import { useSessionStore } from './stores/sessionStore.js';
import { Settings, Download, Upload } from 'lucide-react';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const exportSessionMarkdown = useSessionStore((s) => s.exportSessionMarkdown);
  const exportAll = useSessionStore((s) => s.exportAll);
  const importFromJSON = useSessionStore((s) => s.importFromJSON);

  // Hide initial backend-URL warning if anyone added one in localStorage
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleExportChat = () => {
    if (!currentSessionId) return;
    const result = exportSessionMarkdown(currentSessionId);
    if (!result) return;
    const blob = new Blob([result.content], { type: 'text/markdown' });
    triggerDownload(blob, result.filename);
  };

  const handleExportAll = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = importFromJSON(text);
        // eslint-disable-next-line no-alert
        alert(`Imported ${count} new sessions.`);
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`Import failed: ${err.message}`);
      }
    };
    input.click();
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" data-testid="app-container">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div
          className="w-[260px] bg-surface border-r border-white/5 flex flex-col"
          data-testid="left-sidebar"
        >
          <div className="p-6 border-b border-white/5">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">NEXUS</h1>
            <p className="text-xs text-text-muted mt-1">Multi-Provider AI Hub</p>
          </div>

          <ModeSwitcher />
          <SessionList />

          <div className="p-4 border-t border-white/5 space-y-1">
            <button
              onClick={() => setShowSettings(true)}
              data-testid="open-settings-button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-elevated transition-all text-text-secondary hover:text-text-primary"
            >
              <Settings size={18} />
              <span className="text-sm">API Keys</span>
            </button>

            {currentSessionId && (
              <button
                onClick={handleExportChat}
                data-testid="export-conversation-button"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  hover:bg-elevated transition-all text-text-secondary hover:text-text-primary"
              >
                <Download size={18} />
                <span className="text-sm">Export Chat (.md)</span>
              </button>
            )}

            <button
              onClick={handleExportAll}
              data-testid="export-all-button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-elevated transition-all text-text-secondary hover:text-text-primary"
            >
              <Download size={18} />
              <span className="text-sm">Backup All (.json)</span>
            </button>

            <button
              onClick={handleImport}
              data-testid="import-button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-elevated transition-all text-text-secondary hover:text-text-primary"
            >
              <Upload size={18} />
              <span className="text-sm">Import Backup</span>
            </button>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatCanvas />
        </div>
      </div>

      <APIStatusBar />

      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default App;
