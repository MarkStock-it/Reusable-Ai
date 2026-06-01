import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sessions + messages live entirely in localStorage. Single-user only.
export const useSessionStore = create(
  persist(
    (set, get) => ({
      sessions: [],         // [{id, title, mode, pinned, createdAt, updatedAt}]
      messagesBySession: {}, // {sessionId: [{id, role, content, mode, provider, model, tokens, createdAt}]}
      currentSessionId: null,

      get currentSession() {
        const id = get().currentSessionId;
        return get().sessions.find((s) => s.id === id) || null;
      },

      createSession: (title, mode = 'general') => {
        const now = Date.now();
        const session = {
          id: crypto.randomUUID(),
          title,
          mode,
          pinned: false,
          createdAt: now,
          updatedAt: now,
        };
        set({
          sessions: [session, ...get().sessions],
          messagesBySession: { ...get().messagesBySession, [session.id]: [] },
          currentSessionId: session.id,
        });
        return session;
      },

      setCurrentSession: (id) => {
        set({ currentSessionId: id });
      },

      updateSession: (id, patch) => {
        set({
          sessions: get().sessions.map((s) =>
            s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s
          ),
        });
      },

      deleteSession: (id) => {
        const { [id]: _, ...rest } = get().messagesBySession;
        set({
          sessions: get().sessions.filter((s) => s.id !== id),
          messagesBySession: rest,
          currentSessionId: get().currentSessionId === id ? null : get().currentSessionId,
        });
      },

      getMessages: (sessionId) => get().messagesBySession[sessionId] || [],

      addMessage: (sessionId, message) => {
        const full = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          ...message,
        };
        const list = get().messagesBySession[sessionId] || [];
        set({
          messagesBySession: {
            ...get().messagesBySession,
            [sessionId]: [...list, full],
          },
        });
        // touch session updatedAt
        get().updateSession(sessionId, {});
        return full;
      },

      updateMessage: (sessionId, messageId, patch) => {
        const list = get().messagesBySession[sessionId] || [];
        set({
          messagesBySession: {
            ...get().messagesBySession,
            [sessionId]: list.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
          },
        });
      },

      appendToMessage: (sessionId, messageId, chunk) => {
        const list = get().messagesBySession[sessionId] || [];
        set({
          messagesBySession: {
            ...get().messagesBySession,
            [sessionId]: list.map((m) =>
              m.id === messageId ? { ...m, content: m.content + chunk } : m
            ),
          },
        });
      },

      // Export everything (sessions + messages) as JSON string
      exportAll: () => {
        const data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          sessions: get().sessions,
          messagesBySession: get().messagesBySession,
        };
        return JSON.stringify(data, null, 2);
      },

      // Import from JSON (merges; existing IDs are kept, new ones added)
      importFromJSON: (json) => {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        if (!data.sessions || !data.messagesBySession) {
          throw new Error('Invalid NEXUS export file.');
        }
        const existingIds = new Set(get().sessions.map((s) => s.id));
        const newSessions = data.sessions.filter((s) => !existingIds.has(s.id));
        set({
          sessions: [...newSessions, ...get().sessions],
          messagesBySession: { ...data.messagesBySession, ...get().messagesBySession },
        });
        return newSessions.length;
      },

      exportSessionMarkdown: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return null;
        const messages = get().messagesBySession[sessionId] || [];
        let out = `# ${session.title}\n\nMode: ${session.mode}\n\n---\n\n`;
        for (const m of messages) {
          const label = m.role === 'user' ? '**You:**' : '**AI:**';
          out += `${label}\n\n${m.content}\n\n---\n\n`;
        }
        return { content: out, filename: `${session.title}.md` };
      },
    }),
    { name: 'nexus.sessions' }
  )
);
