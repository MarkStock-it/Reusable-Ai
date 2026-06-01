import React, { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore.js';
import { Search, Pin, Trash2, Edit2, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SessionList() {
  const sessions = useSessionStore((s) => s.sessions);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const updateSession = useSessionStore((s) => s.updateSession);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions
    .filter((s) => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

  const handleEditSave = () => {
    if (editTitle.trim()) updateSession(editingId, { title: editTitle.trim() });
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="session-list">
      <div className="p-4 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="session-search-input"
            className="w-full bg-elevated pl-9 pr-3 py-2 rounded-md text-sm
              text-text-primary placeholder-text-muted
              border border-transparent focus:border-primary/30
              outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredSessions.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-8">
            {searchTerm ? 'No sessions found' : 'No sessions yet'}
          </div>
          ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const isActive = currentSessionId === session.id;
              const isEditing = editingId === session.id;

              return (
                <div
                  key={session.id}
                  data-testid={`session-item-${session.id}`}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-elevated border-l-2 border-primary'
                        : 'hover:bg-surface border-l-2 border-transparent hover:border-primary/30'
                    }
                  `}
                  onClick={() => !isEditing && setCurrentSession(session.id)}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-background px-2 py-1 rounded text-sm
                          text-text-primary outline-none border border-primary/30"
                        autoFocus
                      />
                      <button onClick={handleEditSave} className="p-1 hover:bg-primary/20 rounded">
                        <Check size={14} className="text-primary" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 hover:bg-elevated rounded"
                      >
                        <X size={14} className="text-text-muted" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text-primary font-medium truncate">
                            {session.title}
                          </div>
                          <div className="text-xs text-text-muted mt-1">
                            {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                          </div>
                        </div>
                        {session.pinned && <Pin size={14} className="text-primary flex-shrink-0" />}
                      </div>

                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => updateSession(session.id, { pinned: !session.pinned })}
                          className="p-1.5 hover:bg-background rounded"
                          data-testid={`pin-session-${session.id}`}
                          title={session.pinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin
                            size={14}
                            className={session.pinned ? 'text-primary' : 'text-text-muted'}
                          />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(session.id);
                            setEditTitle(session.title);
                          }}
                          className="p-1.5 hover:bg-background rounded"
                          data-testid={`edit-session-${session.id}`}
                          title="Rename"
                        >
                          <Edit2 size={14} className="text-text-muted" />
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="p-1.5 hover:bg-background rounded"
                          data-testid={`delete-session-${session.id}`}
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-text-muted hover:text-red-400" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
