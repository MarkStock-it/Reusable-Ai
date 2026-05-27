import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function MessageBubble({ message, mode }) {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
              remarkPlugins={[remarkGfm]}
              components={{
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
                        customStyle={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '16px',
                          fontSize: '0.85em',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
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
              }}
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
          </div>
        )}
      </div>
    </div>
  );
}