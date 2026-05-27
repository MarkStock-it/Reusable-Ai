import React from 'react';
import { useModeStore, AI_MODES } from '../stores/modeStore';
import { useSessionStore } from '../stores/sessionStore';
import * as Icons from 'lucide-react';

export default function ModeSwitcher() {
  const { currentMode, setMode } = useModeStore();
  const { createSession } = useSessionStore();

  const handleModeChange = async (modeId) => {
    setMode(modeId);
    // Create new session with this mode
    const mode = AI_MODES[modeId];
    await createSession(`New ${mode.label} Chat`, modeId);
  };

  return (
    <div className="space-y-2 p-4" data-testid="mode-switcher">
      <div className="text-text-muted text-xs uppercase tracking-wider mb-3">
        AI Mode
      </div>
      {Object.values(AI_MODES).map((mode) => {
        const IconComponent = Icons[mode.icon];
        const isActive = currentMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            data-testid={`mode-${mode.id}`}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-200
              ${
                isActive
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-surface border border-transparent'
              }
            `}
            style={{
              boxShadow: isActive ? `0 0 0 1px ${mode.color}40` : 'none',
            }}
          >
            {IconComponent && (
              <IconComponent 
                size={18} 
                style={{ color: isActive ? mode.color : 'var(--text-secondary)' }}
              />
            )}
            <span 
              className={`text-sm ${
                isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
              }`}
            >
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}