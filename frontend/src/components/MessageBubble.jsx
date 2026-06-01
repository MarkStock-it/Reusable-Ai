import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('Auto');
  const [selectedColor, setSelectedColor] = useState('#444');
  const customSelectRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (customSelectRef.current && !customSelectRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

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
          <div className="mt-2">
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
              <div className="toolbar" role="toolbar" aria-label="Relay provider and model selector">
                <div className="seg">
                  <span className="seg-label">Provider</span>
                  <div className={`custom-select ${dropdownOpen ? 'open' : ''}`} ref={customSelectRef}>
                    <div className="select-display" onClick={() => setDropdownOpen((s) => !s)}>
                      <span className="provider-dot" style={{ background: selectedColor }} />
                      <span>{selectedLabel}</span>
                      <i className="ti ti-chevron-down chevron" aria-hidden="true" />
                    </div>
                    <div className="dropdown">
                      <div className={`dropdown-item ${relayProvider === '' ? 'active' : ''}`} onClick={() => { setRelayProvider(''); setSelectedLabel('Auto'); setSelectedColor('#444'); setDropdownOpen(false); }}>
                        <span className="provider-dot" style={{ background: '#444' }} /> Auto
                      </div>
                      {Array.from(new Set(keys.map((k) => k.provider))).filter(Boolean).map((p) => (
                        PROVIDERS[p] ? (
                          <div key={p} className={`dropdown-item ${relayProvider === p ? 'active' : ''}`} onClick={() => { setRelayProvider(p); setSelectedLabel(PROVIDERS[p].label); setSelectedColor(PROVIDERS[p].color); setRelayModel(PROVIDERS[p].defaultModel || ''); setDropdownOpen(false); }}>
                            <span className="provider-dot" style={{ background: PROVIDERS[p].color }} /> {PROVIDERS[p].label}
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                </div>

                <div className="seg">
                  <span className="seg-label">Model</span>
                  <input className="model-input" id="modelInput" type="text" placeholder="model (optional)" value={relayModel} onChange={(e) => setRelayModel(e.target.value)} />
                </div>

                <div className="seg" style={{ justifyContent: 'flex-end' }}>
                  <button
                    onClick={async () => {
                      if (!currentSessionId) return;
                      // If no provider selected, treat as auto => pick first available provider
                      const target = relayProvider || Array.from(new Set(keys.map((k) => k.provider))).filter(Boolean)[0];
                      if (!target) return;
                      setIsRelaying(true);

                      const userMsg = addMessage(currentSessionId, { role: 'user', content: message.content, mode: currentMode });
                      const assistantMsg = addMessage(currentSessionId, { role: 'assistant', content: '', mode: currentMode });

                      try {
                        const history = [ { role: 'system', content: '' }, { role: 'user', content: message.content } ];
                        const stream = chatWithRotation({ keys, systemPrompt: '', messages: history, onMarkRateLimited: markRateLimited, onMarkError: markError, onMarkActive: markActive, onUpdateLastUsed: updateLastUsed, targetProvider: target, targetModel: relayModel });
                        for await (const chunk of stream) {
                          if (chunk.type === 'status') setStatus(chunk.provider, chunk.keyLabel, chunk.keyId);
                          else if (chunk.type === 'content') { appendToMessage(currentSessionId, assistantMsg.id, chunk.content); updateMessage(currentSessionId, assistantMsg.id, { provider: chunk.provider, model: chunk.model }); }
                          else if (chunk.type === 'done') { if (chunk.tokens) addTokens(chunk.tokens); updateMessage(currentSessionId, assistantMsg.id, { tokens: chunk.tokens, provider: chunk.provider, model: chunk.model }); }
                          else if (chunk.type === 'error') { appendToMessage(currentSessionId, assistantMsg.id, `\n\n⚠ ${chunk.content}`); }
                        }
                      } finally {
                        setIsRelaying(false);
                        setRelayOpen(false);
                        setDropdownOpen(false);
                      }
                    }}
                    className="reset-btn"
                  >
                    {isRelaying ? <Loader className="w-4 h-4 animate-spin" /> : 'Send'}
                  </button>
                  <button onClick={() => { setRelayOpen(false); setDropdownOpen(false); }} className="reset-btn" style={{ marginLeft: 8 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}