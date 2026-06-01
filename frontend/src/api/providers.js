// Provider definitions: detection, base URLs, model defaults, and request formatters.
// All providers are called directly from the browser. Some (OpenAI, Anthropic) require
// special headers/flags to bypass CORS — we set them where needed.

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    detect: (k) => k.startsWith('sk-') && !k.startsWith('sk-ant-'),
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    color: '#10a37f',
  },
  anthropic: {
    label: 'Anthropic',
    detect: (k) => k.startsWith('sk-ant-'),
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    color: '#d97757',
  },
  gemini: {
    label: 'Gemini',
    detect: (k) => k.startsWith('AIza') || k.startsWith('AQ'),
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-2.5-flash',
    color: '#4285f4',
  },
  groq: {
    label: 'Groq',
    detect: (k) => k.startsWith('gsk_'),
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    color: '#f55036',
  },
  mistral: {
    label: 'Mistral',
    detect: (k) => /^[A-Za-z0-9]{32}$/.test(k) || k.startsWith('mistral_'),
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    color: '#ff7000',
  },
  cohere: {
    label: 'Cohere',
    detect: (k) => k.startsWith('co-') || (k.length >= 40 && /^[A-Za-z0-9]+$/.test(k)),
    baseUrl: 'https://api.cohere.com/v2',
    defaultModel: 'command-r-08-2024',
    color: '#39594d',
  },
};

export function detectProvider(apiKey) {
  const key = apiKey.trim();
  // Order matters: anthropic before openai (both can start with sk-)
  if (PROVIDERS.anthropic.detect(key)) return 'anthropic';
  if (PROVIDERS.openai.detect(key)) return 'openai';
  if (PROVIDERS.gemini.detect(key)) return 'gemini';
  if (PROVIDERS.groq.detect(key)) return 'groq';
  if (PROVIDERS.mistral.detect(key)) return 'mistral';
  if (PROVIDERS.cohere.detect(key)) return 'cohere';
  return 'unknown';
}

export function maskKey(key) {
  if (!key || key.length < 4) return '...****';
  return `...${key.slice(-4)}`;
}

// Build the fetch request for a given provider's chat completion endpoint.
// All providers below support streaming via SSE.
export function buildChatRequest({ provider, apiKey, model, systemPrompt, messages }) {
  const cfg = PROVIDERS[provider];
  const useModel = model || cfg.defaultModel;

  if (provider === 'openai' || provider === 'groq' || provider === 'mistral') {
    // OpenAI-compatible format
    const body = {
      model: useModel,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    };
    return {
      url: `${cfg.baseUrl}/chat/completions`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      format: 'openai-sse',
      model: useModel,
    };
  }

  if (provider === 'anthropic') {
    const body = {
      model: useModel,
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    return {
      url: `${cfg.baseUrl}/messages`,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      format: 'anthropic-sse',
      model: useModel,
    };
  }

  if (provider === 'gemini') {
    // Gemini uses a different request shape. We use streamGenerateContent with
    // alt=sse for SSE-style streaming. System instruction prepended to first user message.
    const contents = messages.map((m, idx) => {
      let text = m.content;
      if (idx === 0 && m.role === 'user' && systemPrompt) {
        text = `[System: ${systemPrompt}]\n\n${m.content}`;
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      };
    });
    const body = { contents };
    return {
      url: `${cfg.baseUrl}/models/${useModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      format: 'gemini-sse',
      model: useModel,
    };
  }

  if (provider === 'cohere') {
    const body = {
      model: useModel,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    };
    return {
      url: `${cfg.baseUrl}/chat`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      format: 'cohere-sse',
      model: useModel,
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// Parse a single SSE data line into a text delta for the given format.
// Returns { text: string|null, done: boolean }
export function parseChunk(format, dataLine) {
  if (!dataLine || dataLine === '[DONE]') return { text: null, done: true };

  try {
    const obj = JSON.parse(dataLine);

    if (format === 'openai-sse') {
      const text = obj.choices?.[0]?.delta?.content || '';
      const done = obj.choices?.[0]?.finish_reason != null;
      return { text, done };
    }

    if (format === 'anthropic-sse') {
      if (obj.type === 'content_block_delta') {
        return { text: obj.delta?.text || '', done: false };
      }
      if (obj.type === 'message_stop') return { text: null, done: true };
      return { text: '', done: false };
    }

    if (format === 'gemini-sse') {
      const parts = obj.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || '').join('');
      const done = obj.candidates?.[0]?.finishReason != null;
      return { text, done };
    }

    if (format === 'cohere-sse') {
      if (obj.type === 'content-delta') {
        return { text: obj.delta?.message?.content?.text || '', done: false };
      }
      if (obj.type === 'message-end') return { text: null, done: true };
      return { text: '', done: false };
    }
  } catch {
    // partial / non-JSON chunk — caller will buffer & retry
  }
  return { text: '', done: false };
}
