import React, { useEffect, useRef } from 'react';
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-text-muted">Provider</label>
              <select
                value={currentSession.provider || ''}
                onChange={(e) =>
                  updateSession(currentSession.id, {
                    provider: e.target.value || undefined,
                    model: PROVIDERS[e.target.value]?.defaultModel || currentSession.model,
                  })
                }
                className="bg-background px-3 py-1 rounded text-sm border border-transparent focus:border-primary/30"
              >
                <option value="">Auto</option>
                {Object.keys(PROVIDERS).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDERS[p].label}
                  </option>
                ))}
              </select>

              <label className="text-xs text-text-muted">Model</label>
              <input
                type="text"
                value={currentSession.model || ''}
                onChange={(e) => updateSession(currentSession.id, { model: e.target.value || undefined })}
                placeholder="model (leave blank for provider default)"
                className="bg-background px-3 py-1 rounded text-sm w-[320px] border border-transparent focus:border-primary/30"
              />
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
