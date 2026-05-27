import { create } from 'zustand';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useSessionStore = create((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  loading: false,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API}/sessions`);
      set({ sessions: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createSession: async (title, mode = 'general') => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API}/sessions`, { title, mode });
      const newSession = response.data;
      set({ 
        sessions: [newSession, ...get().sessions], 
        currentSession: newSession,
        messages: [],
        loading: false 
      });
      return newSession;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  setCurrentSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}`);
      const messagesResponse = await axios.get(`${API}/sessions/${sessionId}/messages`);
      set({ 
        currentSession: response.data, 
        messages: messagesResponse.data,
        loading: false 
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateSession: async (sessionId, updates) => {
    try {
      const params = new URLSearchParams();
      if (updates.title) params.append('title', updates.title);
      if (updates.pinned !== undefined) params.append('pinned', updates.pinned);
      
      await axios.patch(`${API}/sessions/${sessionId}?${params.toString()}`);
      
      set({
        sessions: get().sessions.map(s => 
          s.id === sessionId ? { ...s, ...updates } : s
        ),
        currentSession: get().currentSession?.id === sessionId 
          ? { ...get().currentSession, ...updates } 
          : get().currentSession
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await axios.delete(`${API}/sessions/${sessionId}`);
      set({ 
        sessions: get().sessions.filter(s => s.id !== sessionId),
        currentSession: get().currentSession?.id === sessionId ? null : get().currentSession,
        messages: get().currentSession?.id === sessionId ? [] : get().messages
      });
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  },

  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },

  updateLastMessage: (content) => {
    const messages = get().messages;
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        set({
          messages: [
            ...messages.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + content }
          ]
        });
      }
    }
  },

  exportSession: async (sessionId, format = 'md') => {
    try {
      const response = await axios.post(`${API}/chat/export`, {
        session_id: sessionId,
        format
      });
      
      // Download file
      const blob = new Blob([response.data.content], { 
        type: format === 'md' ? 'text/markdown' : 'text/plain' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting session:', error);
    }
  },
}));