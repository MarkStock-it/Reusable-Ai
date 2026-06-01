import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectProvider, maskKey } from '../api/providers';
import { COOLDOWN_MS } from '../api/rotationEngine';

// All API keys live in localStorage (plaintext, single-user solo app).
export const useKeysStore = create(
  persist(
    (set, get) => ({
      keys: [],

      addKey: (label, value) => {
        const provider = detectProvider(value);
        if (provider === 'unknown') {
          throw new Error('Could not detect provider from key prefix.');
        }
        const newKey = {
          id: crypto.randomUUID(),
          label: label.trim(),
          provider,
          value,
          masked: maskKey(value),
          status: 'active',
          rateLimitUntil: null,
          lastError: null,
          lastUsed: null,
          createdAt: Date.now(),
        };
        set({ keys: [...get().keys, newKey] });
        return newKey;
      },

      deleteKey: (id) => {
        set({ keys: get().keys.filter((k) => k.id !== id) });
      },

      markRateLimited: (id) => {
        set({
          keys: get().keys.map((k) =>
            k.id === id
              ? { ...k, status: 'rate_limited', rateLimitUntil: Date.now() + COOLDOWN_MS }
              : k
          ),
        });
      },

      markError: (id, message) => {
        set({
          keys: get().keys.map((k) =>
            k.id === id ? { ...k, status: 'error', lastError: message } : k
          ),
        });
      },

      markActive: (id) => {
        set({
          keys: get().keys.map((k) =>
            k.id === id ? { ...k, status: 'active', rateLimitUntil: null, lastError: null } : k
          ),
        });
      },

      updateLastUsed: (id) => {
        set({
          keys: get().keys.map((k) =>
            k.id === id ? { ...k, lastUsed: Date.now() } : k
          ),
        });
      },

      replaceAll: (keys) => set({ keys }),
    }),
    { name: 'nexus.keys' }
  )
);
