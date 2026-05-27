import React, { useState, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useModeStore } from '../stores/modeStore';
import { useStatusStore } from '../stores/statusStore';
import { Send, Loader } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatInput() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentSession, addMessage, updateLastMessage } = useSessionStore();
  const { currentMode, getSystemPrompt } = useModeStore();
  const { setStatus, addTokens, setStreaming } = useStatusStore();
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || !currentSession || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setStreaming(true);

    // Add user message to UI immediately
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    });

    // Add empty assistant message that we'll stream into
    addMessage({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    });

    try {
      const response = await fetch(`${API}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSession.id,
          message: userMessage,
          mode: currentMode,
          system_prompt: getSystemPrompt(currentMode),
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'status') {
                setStatus(parsed.provider, parsed.key_label, parsed.key_id);
              } else if (parsed.type === 'content') {
                updateLastMessage(parsed.content);
              } else if (parsed.type === 'done') {
                if (parsed.tokens) {
                  addTokens(parsed.tokens);
                }
              } else if (parsed.type === 'error' || parsed.type === 'retry') {
                console.log(parsed.message || parsed.content);
              }
            } catch (e) {
              // Stream chunk JSON parse failed (e.g. partial chunk) - intentionally swallowed,
              // next iteration will attempt to parse the completed chunk.
              console.debug('SSE chunk parse skipped:', e?.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // You could add error message to chat here
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

  return (
    <form onSubmit={handleSubmit} className="relative" data-testid="chat-input-form">
      <div className="relative flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isLoading || !currentSession}
          data-testid="chat-input"
          rows={1}
          className="flex-1 bg-elevated px-6 py-4 pr-14 rounded-full
            text-text-primary placeholder-text-muted
            border border-transparent focus:border-primary/30
            outline-none resize-none transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            minHeight: '56px',
            maxHeight: '200px',
            boxShadow: 'none',
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)';
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
          }}
        />
        
        <button
          type="submit"
          disabled={!input.trim() || !currentSession || isLoading}
          data-testid="send-message-button"
          className="absolute right-4 bottom-4
            p-3 rounded-full transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-aurora active:scale-95"
          style={{
            background: input.trim() && !isLoading ? 'var(--accent-aurora)' : 'rgba(139, 92, 246, 0.2)',
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