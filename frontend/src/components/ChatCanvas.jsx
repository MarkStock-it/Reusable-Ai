import React, { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore.js';
import { useModeStore } from '../stores/modeStore.js';
import MessageBubble from './MessageBubble.jsx';
import ChatInput from './ChatInput.jsx';
import { Sparkles } from 'lucide-react';
import { PROVIDERS } from '../api/providers.js';

export default function ChatCanvas() {
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const messagesBySession = useSessionStore((s) => s.messagesBySession);
  const currentMode = useModeStore((s) => s.currentMode);
  const messagesEndRef = useRef(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSessionId ? messagesBySession[currentSessionId] || [] : [];
  const updateSession = useSessionStore((s) => s.updateSession);

  // Provider/model toolbar state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(currentSession?.provider || '');
  const [selectedLabel, setSelectedLabel] = useState(
    currentSession?.provider ? PROVIDERS[currentSession.provider]?.label : 'Auto'
  );
  const [selectedColor, setSelectedColor] = useState(
    currentSession?.provider ? PROVIDERS[currentSession.provider]?.color : '#444'
  );
  const [modelInput, setModelInput] = useState(currentSession?.model || '');
  const customSelectRef = useRef(null);

  useEffect(() => {
    // Sync local toolbar state when switching sessions
    setSelectedProvider(currentSession?.provider || '');
    setSelectedLabel(currentSession?.provider ? PROVIDERS[currentSession.provider]?.label : 'Auto');
    setSelectedColor(currentSession?.provider ? PROVIDERS[currentSession.provider]?.color : '#444');
    setModelInput(currentSession?.model || '');
  }, [currentSession?.id]);

  useEffect(() => {
    function onDocClick(e) {
      if (customSelectRef.current && !customSelectRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const toggleDropdown = () => setDropdownOpen((s) => !s);

  const selectProvider = (key, color, label) => {
    setSelectedProvider(key || '');
    setSelectedColor(color || '#444');
    setSelectedLabel(label || 'Auto');
    setDropdownOpen(false);
    updateSession(currentSession.id, {
      provider: key || undefined,
      model: key ? PROVIDERS[key]?.defaultModel || currentSession.model : undefined,
    });
  };

  const commitModelChange = () => {
    updateSession(currentSession.id, { model: modelInput || undefined });
  };

  const resetAll = () => {
    setSelectedProvider('');
    setSelectedLabel('Auto');
    setSelectedColor('#444');
    setModelInput('');
    updateSession(currentSession.id, { provider: undefined, model: undefined });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" data-testid="empty-state">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome to NEXUS</h2>
          <p className="text-text-secondary">Select an AI mode to start a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full" data-testid="chat-canvas">
      <div className="flex-1 overflow-y-auto px-12 py-8">
        <div className="max-w-[780px] mx-auto">
          <div className="mb-4">
            <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }
.scene { background: transparent; padding: 0; border-radius: 12px; display: flex; justify-content: center; }
.toolbar { display: flex; align-items: center; gap: 0; background: var(--surface); border: 1px solid rgba(255,255,255,0.03); border-radius: 8px; overflow: visible; width: 100%; }
.seg { display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 40px; border-right: 1px solid rgba(255,255,255,0.03); position: relative; }
.seg:last-of-type { border-right: none; flex: 1; }
.seg-label { font-size: 12px; color: var(--text-muted); font-family: -apple-system, BlinkMacSystemFont, sans-serif; white-space: nowrap; }
.custom-select { position: relative; display: flex; align-items: center; }
.select-display { display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: 13px; color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, sans-serif; user-select: none; padding: 4px 0; }
.select-display:hover { color: var(--text-primary); }
.select-display .chevron { font-size: 11px; color: #444; transition: transform 0.15s; }
.custom-select.open .chevron { transform: rotate(180deg); }
.provider-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dropdown { display: none; position: absolute; top: calc(100% + 6px); left: -14px; background: var(--surface); border: 1px solid rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden; z-index: 100; min-width: 160px; padding: 4px; }
.custom-select.open .dropdown { display: block; }
.dropdown-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; font-size: 13px; color: var(--text-secondary); font-family: -apple-system, BlinkMacSystemFont, sans-serif; cursor: pointer; border-radius: 5px; transition: background 0.1s, color 0.1s; }
.dropdown-item:hover { background: rgba(255,255,255,0.02); color: var(--text-primary); }
.dropdown-item.active { color: var(--text-primary); background: rgba(255,255,255,0.02); }
.model-input { background: transparent; border: none; outline: none; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text-primary); width: 100%; height: 100%; }
.model-input::placeholder { color: var(--text-muted); }
.reset-btn { display: flex; align-items: center; gap: 6px; margin: 5px; padding: 0 12px; height: 30px; background: transparent; border: 1px solid rgba(255,255,255,0.03); border-radius: 6px; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text-muted); cursor: pointer; transition: border-color 0.15s, color 0.15s; white-space: nowrap; flex-shrink: 0; }
.reset-btn:hover { border-color: rgba(255,255,255,0.06); color: var(--text-secondary); }
.reset-btn:active { transform: scale(0.97); }`}</style>

            <div className="scene">
              <div className="toolbar" role="toolbar" aria-label="NEXUS provider and model selector">
                <div className="seg">
                  <span className="seg-label">Provider</span>
                  <div className={`custom-select ${dropdownOpen ? 'open' : ''}`} ref={customSelectRef}>
                    <div className="select-display" onClick={toggleDropdown}>
                      <span className="provider-dot" id="activeDot" style={{ background: selectedColor || '#444' }} />
                      <span id="activeLabel">{selectedLabel}</span>
                      <i className="ti ti-chevron-down chevron" aria-hidden="true" />
                    </div>
                    <div className="dropdown" id="dropdown">
                      <div
                        className={`dropdown-item ${selectedProvider === '' ? 'active' : ''}`}
                        data-value=""
                        data-color="#444"
                        onClick={() => selectProvider('', '#444', 'Auto')}
                      >
                        <span className="provider-dot" style={{ background: '#444' }} /> Auto
                      </div>
                      {Object.keys(PROVIDERS).map((p) => (
                        <div
                          key={p}
                          className={`dropdown-item ${selectedProvider === p ? 'active' : ''}`}
                          data-value={p}
                          data-color={PROVIDERS[p].color}
                          onClick={() => selectProvider(p, PROVIDERS[p].color, PROVIDERS[p].label)}
                        >
                          <span className="provider-dot" style={{ background: PROVIDERS[p].color }} /> {PROVIDERS[p].label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="seg">
                  <span className="seg-label">Model</span>
                  <input
                    className="model-input"
                    id="modelInput"
                    type="text"
                    placeholder="model (leave blank for provider default)"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    onBlur={() => commitModelChange()}
                  />
                </div>

                <button className="reset-btn" onClick={resetAll}>Reset</button>
              </div>
            </div>
          </div>
          {messages.length === 0 ? (
            <div className="text-center py-12" data-testid="no-messages">
              <p className="text-text-secondary">Start the conversation...</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} mode={currentMode} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-white/5 px-12 py-6 bg-surface/50 backdrop-blur-sm">
        <div className="max-w-[780px] mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
