import { create } from 'zustand';

export const useStatusStore = create((set) => ({
  currentProvider: null,
  currentKeyLabel: null,
  currentKeyId: null,
  tokensUsed: 0,
  isStreaming: false,

  setStatus: (provider, keyLabel, keyId) => {
    set({ 
      currentProvider: provider, 
      currentKeyLabel: keyLabel,
      currentKeyId: keyId 
    });
  },

  addTokens: (tokens) => {
    set((state) => ({ tokensUsed: state.tokensUsed + tokens }));
  },

  setStreaming: (isStreaming) => {
    set({ isStreaming });
  },

  reset: () => {
    set({ 
      currentProvider: null, 
      currentKeyLabel: null,
      currentKeyId: null,
      tokensUsed: 0,
      isStreaming: false 
    });
  },
}));