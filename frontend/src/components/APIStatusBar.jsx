import React, { useEffect } from 'react';
import { useStatusStore } from '../stores/statusStore.js';
import { useKeysStore } from '../stores/keysStore.js';
import { PROVIDERS } from '../api/providers.js';

export default function APIStatusBar() {
  const currentProvider = useStatusStore((s) => s.currentProvider);
  const currentKeyLabel = useStatusStore((s) => s.currentKeyLabel);
  const tokensUsed = useStatusStore((s) => s.tokensUsed);
  const isStreaming = useStatusStore((s) => s.isStreaming);
  const setStatus = useStatusStore((s) => s.setStatus);

  const keys = useKeysStore((s) => s.keys);

  // Initialise with the first active key on load so the bar isn't empty
  useEffect(() => {
    if (!currentProvider && keys.length > 0) {
      const activeKey = keys.find((k) => k.status === 'active');
      if (activeKey) setStatus(activeKey.provider, activeKey.label, activeKey.id);
    }
  }, [keys, currentProvider, setStatus]);

  const activeKey = keys.find((k) => k.label === currentKeyLabel);
  const dotColor = !currentProvider
    ? '#3d3b52'
    : isStreaming
    ? '#4ade80'
    : activeKey?.status === 'rate_limited'
    ? '#fbbf24'
    : activeKey?.status === 'error'
    ? '#f87171'
    : '#a78bfa';

  const providerLabel = currentProvider
    ? (PROVIDERS[currentProvider]?.label || currentProvider).toUpperCase()
    : 'NO PROVIDER';

  return (
    <div
      className="h-7 bg-surface border-t border-white/5 flex items-center px-6 text-xs font-mono"
      data-testid="api-status-bar"
    >
      <div className="flex items-center gap-3 text-text-secondary">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full transition-all"
            style={{
              backgroundColor: dotColor,
              boxShadow: isStreaming ? `0 0 8px ${dotColor}` : 'none',
            }}
          />
          <span className="uppercase tracking-wider">{providerLabel}</span>
        </div>

        {currentKeyLabel && (
          <>
            <span>·</span>
            <span>{currentKeyLabel}</span>
          </>
        )}

        {activeKey?.status === 'rate_limited' && (
          <>
            <span>·</span>
            <span className="text-amber-400">Rate Limited</span>
          </>
        )}

        <span>·</span>
        <span>{tokensUsed.toLocaleString()} tokens used</span>

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
