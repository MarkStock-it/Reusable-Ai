import React, { useEffect } from 'react';
import { useStatusStore } from '../stores/statusStore';
import { useKeysStore } from '../stores/keysStore';

export default function APIStatusBar() {
  const { currentProvider, currentKeyLabel, tokensUsed, isStreaming, setStatus } = useStatusStore();
  const { keys } = useKeysStore();

  // Initialize status with first active key on load
  useEffect(() => {
    if (!currentProvider && keys.length > 0) {
      const activeKey = keys.find(k => k.status === 'active');
      if (activeKey) {
        setStatus(activeKey.provider, activeKey.label, activeKey.id);
      }
    }
  }, [keys, currentProvider, setStatus]);

  const getStatusDotColor = () => {
    if (!currentProvider) return '#3d3b52'; // muted
    if (isStreaming) return '#4ade80'; // green
    return '#a78bfa'; // violet
  };

  const activeKey = keys.find(k => k.label === currentKeyLabel);

  return (
    <div
      className="h-7 bg-surface border-t border-white/5 flex items-center px-6 text-xs font-mono"
      data-testid="api-status-bar"
    >
      <div className="flex items-center gap-3 text-text-secondary">
        {/* Status Dot */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full transition-all"
            style={{ 
              backgroundColor: getStatusDotColor(),
              boxShadow: isStreaming ? `0 0 8px ${getStatusDotColor()}` : 'none'
            }}
          />
          <span className="uppercase tracking-wider">
            {currentProvider || 'No provider'}
          </span>
        </div>

        {/* Key Label */}
        {currentKeyLabel && (
          <>
            <span>·</span>
            <span>{currentKeyLabel}</span>
          </>
        )}

        {/* Status */}
        {activeKey?.status === 'rate_limited' && (
          <>
            <span>·</span>
            <span className="text-amber-400">Rate Limited</span>
          </>
        )}

        {/* Tokens */}
        <>
          <span>·</span>
          <span>{tokensUsed.toLocaleString()} tokens used</span>
        </>

        {/* Streaming indicator */}
        {isStreaming && (
          <>
            <span>·</span>
            <span className="text-primary animate-pulse">Streaming...</span>
          </>
        )}
      </div>
    </div>
  );
}