// Client-side API rotation engine.
// Tries active keys in order. On HTTP 429 or rate-limit signal, marks that key as
// rate-limited for 60s and tries the next one. Yields chunks for streaming UI.

import { buildChatRequest, parseChunk } from './providers';

const COOLDOWN_MS = 60_000;

/**
 * @param {Object} args
 * @param {Array}  args.keys           - All keys (from store)
 * @param {string} args.systemPrompt
 * @param {Array}  args.messages       - [{role, content}, ...]
 * @param {Function} args.onMarkRateLimited  - (keyId) => void  (store action)
 * @param {Function} args.onMarkError        - (keyId, message) => void
 * @param {Function} args.onMarkActive       - (keyId) => void
 * @param {Function} args.onUpdateLastUsed   - (keyId) => void
 * @param {AbortSignal} [args.signal]
 * @returns AsyncGenerator yielding {type, ...}
 */
export async function* chatWithRotation({
  keys,
  systemPrompt,
  messages,
  onMarkRateLimited,
  onMarkError,
  onMarkActive,
  onUpdateLastUsed,
  signal,
  targetProvider, // optional: only use keys for this provider
  targetModel, // optional: preferred model for this chat
}) {
  const now = Date.now();
  // If a specific provider is requested, limit keys to that provider.
  const providerKeys = targetProvider ? keys.filter((k) => k.provider === targetProvider) : keys;

  if (targetProvider && providerKeys.length === 0) {
    yield {
      type: 'error',
      content: `No API keys configured for provider: ${targetProvider}. Add a key in Settings.`,
    };
    return;
  }

  const active = providerKeys.filter((k) => {
    if (k.status === 'active') return true;
    if (k.status === 'rate_limited' && k.rateLimitUntil && k.rateLimitUntil < now) {
      onMarkActive(k.id);
      return true;
    }
    return false;
  });
  

  if (active.length === 0) {
    yield {
      type: 'error',
      content: 'No active API keys. Add one in Settings.',
    };
    return;
  }

  for (const key of active) {
    yield {
      type: 'status',
      provider: key.provider,
      keyLabel: key.label,
      keyId: key.id,
    };

    try {
      const req = buildChatRequest({
        provider: key.provider,
        apiKey: key.value,
        model: targetModel || key.model || undefined,
        systemPrompt,
        messages,
      });

      onUpdateLastUsed(key.id);

      const res = await fetch(req.url, {
        method: 'POST',
        headers: req.headers,
        body: req.body,
        signal,
      });

      if (res.status === 429) {
        onMarkRateLimited(key.id);
        yield {
          type: 'retry',
          message: `Rate limit on ${key.label}, rotating...`,
        };
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        onMarkError(key.id, errText.slice(0, 200));
        yield {
          type: 'retry',
          message: `Error on ${key.label} (${res.status}), rotating...`,
        };
        continue;
      }

      // Stream parse
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split into SSE lines (data: ...\n\n)
        let lineEnd;
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const rawLine = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (!rawLine || !rawLine.startsWith('data:')) continue;
          const dataLine = rawLine.slice(5).trim();
          if (!dataLine) continue;

          const { text, done: chunkDone } = parseChunk(req.format, dataLine);
          if (text) {
            totalText += text;
            yield {
              type: 'content',
              content: text,
              provider: key.provider,
              model: req.model,
            };
          }
          if (chunkDone) break;
        }
      }

      yield {
        type: 'done',
        provider: key.provider,
        model: req.model,
        tokens: Math.round(totalText.length / 4), // rough estimate
      };
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        yield { type: 'error', content: 'Cancelled.' };
        return;
      }
      onMarkError(key.id, err.message);
      yield {
        type: 'retry',
        message: `Network error on ${key.label}, rotating...`,
      };
    }
  }

  yield {
    type: 'error',
    content: 'All keys exhausted or unreachable.',
  };
}

export { COOLDOWN_MS };
