import { create } from 'zustand';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useKeysStore = create((set, get) => ({
  keys: [],
  loading: false,
  error: null,

  fetchKeys: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API}/keys`);
      set({ keys: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addKey: async (label, key) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API}/keys`, { label, key });
      set({ keys: [...get().keys, response.data], loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteKey: async (keyId) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API}/keys/${keyId}`);
      set({ keys: get().keys.filter(k => k.id !== keyId), loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateKeyStatus: async (keyId, status) => {
    try {
      await axios.patch(`${API}/keys/${keyId}/status?status=${status}`);
      set({
        keys: get().keys.map(k => 
          k.id === keyId ? { ...k, status } : k
        )
      });
    } catch (error) {
      console.error('Error updating key status:', error);
    }
  },
}));