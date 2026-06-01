import React, { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore.js';
import { useKeysStore } from '../stores/keysStore.js';
import { useModeStore } from '../stores/modeStore.js';
import { useStatusStore } from '../stores/statusStore.js';
import { chatWithRotation } from '../api/rotationEngine.js';
import { Send, Loader } from 'lucide-react';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const getMessages = useSessionStore((s) => s.getMessages);
  const addMessage = useSessionStore((s) => s.addMessage);
  const appendToMessage = useSessionStore((s) => s.appendToMessage);
  const updateMessage = useSessionStore((s) => s.updateMessage);

  const currentMode = useModeStore((s) => s.currentMode);
  const getSystemPrompt = useModeStore((s) => s.getSystemPrompt);
  const currentSession = useSessionStore((s) => s.currentSession);

  const keys = useKeysStore((s) => s.keys);
  const markRateLimited = useKeysStore((s) => s.markRateLimited);
  const markError = useKeysStore((s) => s.markError);
  const markActive = useKeysStore((s) => s.markActive);
  const updateLastUsed = useKeysStore((s) => s.updateLastUsed);

  const setStatus = useStatusStore((s) => s.setStatus);
  const addTokens = useStatusStore((s) => s.addTokens);
  const setStreaming = useStatusStore((s) => s.setStreaming);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentSessionId || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);
    setStreaming(true);

    // Persist user message
    addMessage(currentSessionId, {
      role: 'user',
      content: userText,
      mode: currentMode,
    });

    // Create empty assistant message we'll stream into
    const assistantMsg = addMessage(currentSessionId, {
      role: 'assistant',
      content: '',
      mode: currentMode,
    });

    // Build history (excluding the empty assistant placeholder we just added)
    const history = getMessages(currentSessionId)
      .filter((m) => m.id !== assistantMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const stream = chatWithRotation({
        keys,
        systemPrompt: getSystemPrompt(currentMode),
        messages: history,
        onMarkRateLimited: markRateLimited,
        onMarkError: markError,
        onMarkActive: markActive,
        onUpdateLastUsed: updateLastUsed,
        targetProvider: currentSession?.provider,
        targetModel: currentSession?.model,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'status') {
          setStatus(chunk.provider, chunk.keyLabel, chunk.keyId);
        } else if (chunk.type === 'content') {
          appendToMessage(currentSessionId, assistantMsg.id, chunk.content);
          updateMessage(currentSessionId, assistantMsg.id, {
            provider: chunk.provider,
            model: chunk.model,
          });
        } else if (chunk.type === 'done') {
          if (chunk.tokens) addTokens(chunk.tokens);
          updateMessage(currentSessionId, assistantMsg.id, {
            tokens: chunk.tokens,
            provider: chunk.provider,
            model: chunk.model,
          });
        } else if (chunk.type === 'error') {
          appendToMessage(currentSessionId, assistantMsg.id, `\n\n⚠ ${chunk.content}`);
        } else if (chunk.type === 'retry') {
          // Silent retry; status bar updates via next 'status' chunk
        }
      }
    } finally {
      setIsLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasKeys = keys.length > 0;
  const placeholder = !hasKeys
    ? 'Add an API key in Settings to start chatting...'
    : !currentSessionId
    ? 'Pick a mode to start a session...'
    : 'Type your message...';

  return (
    <form onSubmit={handleSubmit} className="relative" data-testid="chat-input-form">
      <div className="relative flex items-end gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || !currentSessionId || !hasKeys}
          data-testid="chat-input"
          rows={1}
          className="flex-1 bg-elevated px-6 py-4 pr-14 rounded-full
            text-text-primary placeholder-text-muted
            border border-transparent focus:border-primary/30
            outline-none resize-none transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '56px', maxHeight: '200px' }}
          onFocus={(e) => {
            e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)';
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
          }}
        />

        <button
          type="submit"
          disabled={!input.trim() || !currentSessionId || isLoading || !hasKeys}
          data-testid="send-message-button"
          className="absolute right-4 bottom-4
            p-3 rounded-full transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-aurora active:scale-95"
          style={{
            background:
              input.trim() && !isLoading && hasKeys
                ? 'var(--accent-aurora)'
                : 'rgba(139, 92, 246, 0.2)',
            transform: isLoading ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {isLoading ? (
            <Loader className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </form>
  );
}
