import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore.js';
import { useKeysStore } from '../stores/keysStore.js';
import { useModeStore } from '../stores/modeStore.js';
import { useStatusStore } from '../stores/statusStore.js';
import { chatWithRotation } from '../api/rotationEngine.js';
import { PROVIDERS } from '../api/providers.js';
import { Loader } from 'lucide-react';

// Stable references outside component to avoid re-renders
const REMARK_PLUGINS = [remarkGfm];
const CODE_BLOCK_STYLE = {
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '0.85em',
  fontFamily: 'JetBrains Mono, monospace',
};

export default function MessageBubble({ message, mode }) {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState(null);
  const [relayOpen, setRelayOpen] = useState(false);
  const [relayProvider, setRelayProvider] = useState('');
  const [relayModel, setRelayModel] = useState('');
  const [isRelaying, setIsRelaying] = useState(false);

  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const addMessage = useSessionStore((s) => s.addMessage);
  const appendToMessage = useSessionStore((s) => s.appendToMessage);
  const updateMessage = useSessionStore((s) => s.updateMessage);
  const keys = useKeysStore((s) => s.keys);
  const markRateLimited = useKeysStore((s) => s.markRateLimited);
  const markError = useKeysStore((s) => s.markError);
  const markActive = useKeysStore((s) => s.markActive);
  const updateLastUsed = useKeysStore((s) => s.updateLastUsed);
  const currentMode = useModeStore((s) => s.currentMode);
  const setStatus = useStatusStore((s) => s.setStatus);
  const addTokens = useStatusStore((s) => s.addTokens);

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const codeIndex = node?.position?.start?.line || 0;

      return !inline && match ? (
        <div className="relative my-4 group">
          {/* Language badge */}
          <div className="absolute top-3 right-3 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-black/40 text-text-secondary font-mono">
                {match[1]}
              </span>
              <button
                onClick={() => handleCopyCode(codeString, codeIndex)}
                data-testid="copy-code-button"
                className="p-2 rounded bg-black/40 hover:bg-black/60 transition-all
                  opacity-0 group-hover:opacity-100"
                title="Copy code"
              >
                {copiedCode === codeIndex ? (
                  <Check size={14} className="text-primary" />
                ) : (
                  <Copy size={14} className="text-text-secondary" />
                )}
              </button>
            </div>
          </div>

          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            customStyle={CODE_BLOCK_STYLE}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  }), [copiedCode]);

  return (
    <div
      data-testid={`message-${message.role}`}
      className={`
        flex w-full mb-6 animate-slide-up
        ${isUser ? 'justify-end' : 'justify-start'}
      `}
    >
      <div
        className={`
          max-w-[85%] ${mode === 'creative' ? 'font-serif' : ''}
          ${isUser 
            ? 'bg-elevated px-6 py-4 rounded-lg border border-white/5' 
            : 'px-0 py-0'
          }
        `}
      >
        {isUser ? (
          <div className="text-text-primary text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="markdown-body text-text-primary">
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Metadata for assistant messages */}
        {!isUser && message.provider && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3 text-xs text-text-muted">
            <span>{message.provider}</span>
            {message.model && (
              <>
                <span>•</span>
                <span>{message.model}</span>
              </>
            )}
            {message.tokens && (
              <>
                <span>•</span>
                <span>{message.tokens} tokens</span>
              </>
            )}
            <button
              onClick={() => {
                setRelayOpen((s) => !s);
                setRelayProvider('');
                setRelayModel('');
              }}
              className="ml-2 px-2 py-1 bg-elevated rounded text-xs hover:bg-background"
              title="Relay this assistant message to another provider"
            >
              Relay
            </button>
          </div>
        )}

        {/* Relay UI */}
        {relayOpen && (
          <div className="mt-2 p-3 bg-elevated rounded border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-text-muted">Provider</label>
              <select
                value={relayProvider}
                onChange={(e) => {
                  setRelayProvider(e.target.value);
                  setRelayModel(PROVIDERS[e.target.value]?.defaultModel || '');
                }}
                className="bg-background px-2 py-1 rounded text-sm"
              >
                <option value="">Select provider</option>
                {Object.keys(PROVIDERS).map((p) => (
                  <option key={p} value={p}>{PROVIDERS[p].label}</option>
                ))}
              </select>

              <label className="text-xs text-text-muted">Model</label>
              <input
                value={relayModel}
                onChange={(e) => setRelayModel(e.target.value)}
                placeholder="model (optional)"
                className="bg-background px-2 py-1 rounded text-sm w-[320px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (!relayProvider || !currentSessionId) return;
                  setIsRelaying(true);

                  // Add user message with the assistant content
                  const userMsg = addMessage(currentSessionId, {
                    role: 'user',
                    content: message.content,
                    mode: currentMode,
                  });

                  // Create assistant placeholder
                  const assistantMsg = addMessage(currentSessionId, {
                    role: 'assistant',
                    content: '',
                    mode: currentMode,
                  });

                  try {
                    const history = [
                      { role: 'system', content: '' },
                      { role: 'user', content: message.content },
                    ];

                    const stream = chatWithRotation({
                      keys,
                      systemPrompt: '',
                      messages: history,
                      onMarkRateLimited: markRateLimited,
                      onMarkError: markError,
                      onMarkActive: markActive,
                      onUpdateLastUsed: updateLastUsed,
                      targetProvider: relayProvider,
                      targetModel: relayModel,
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
                      }
                    }
                  } finally {
                    setIsRelaying(false);
                    setRelayOpen(false);
                  }
                }}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                {isRelaying ? <Loader className="w-4 h-4 animate-spin" /> : 'Send'}
              </button>

              <button onClick={() => setRelayOpen(false)} className="px-3 py-1 bg-elevated rounded">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}