import React, { useState, useEffect } from 'react';
import { useKeysStore } from '../stores/keysStore';
import { X, Plus, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function SettingsDrawer({ isOpen, onClose }) {
  const { keys, loading, error, fetchKeys, addKey, deleteKey } = useKeysStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen, fetchKeys]);

  const handleAddKey = async (e) => {
    e.preventDefault();
    setAddError(null);

    if (!newLabel.trim() || !newKey.trim()) {
      setAddError('Please fill in all fields');
      return;
    }

    try {
      await addKey(newLabel, newKey);
      setNewLabel('');
      setNewKey('');
      setShowAddForm(false);
    } catch (error) {
      setAddError(error.message || 'Failed to add API key');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'rate_limited':
        return <Clock size={16} className="text-amber-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'rate_limited':
        return 'Rate Limited';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        data-testid="settings-backdrop"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[420px] bg-surface/95 backdrop-blur-xl
          border-l border-white/5 z-50 overflow-y-auto"
        data-testid="settings-drawer"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface/95 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">API Keys</h2>
          <button
            onClick={onClose}
            data-testid="close-settings"
            className="p-2 hover:bg-elevated rounded-lg transition-all"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add Key Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              data-testid="add-key-button"
              className="w-full flex items-center justify-center gap-2 px-4 py-3
                bg-primary/10 hover:bg-primary/20 border border-primary/30
                rounded-lg transition-all text-primary font-medium"
            >
              <Plus size={18} />
              Add API Key
            </button>
          )}

          {/* Add Key Form */}
          {showAddForm && (
            <form onSubmit={handleAddKey} className="space-y-4 p-4 bg-elevated rounded-lg border border-white/5">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., My OpenAI Key"
                  data-testid="key-label-input"
                  className="w-full bg-background px-4 py-2 rounded-lg
                    text-text-primary placeholder-text-muted
                    border border-transparent focus:border-primary/30
                    outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk-..."
                  data-testid="key-value-input"
                  className="w-full bg-background px-4 py-2 rounded-lg font-mono text-sm
                    text-text-primary placeholder-text-muted
                    border border-transparent focus:border-primary/30
                    outline-none transition-all"
                />
              </div>

              {addError && (
                <div className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {addError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="save-key-button"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-glow
                    text-white rounded-lg transition-all font-medium"
                >
                  Add Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewLabel('');
                    setNewKey('');
                    setAddError(null);
                  }}
                  data-testid="cancel-add-key"
                  className="px-4 py-2 bg-elevated hover:bg-background
                    text-text-secondary rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Keys List */}
          <div className="space-y-3">
            {loading && keys.length === 0 ? (
              <div className="text-center py-8 text-text-muted">Loading keys...</div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No API keys configured yet
              </div>
            ) : (
              keys.map((key) => (
                <div
                  key={key.id}
                  data-testid={`api-key-${key.id}`}
                  className="p-4 bg-elevated rounded-lg border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-text-primary mb-1">
                        {key.label}
                      </div>
                      <div className="text-xs text-text-muted uppercase tracking-wider">
                        {key.provider}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteKey(key.id)}
                      data-testid={`delete-key-${key.id}`}
                      className="p-2 hover:bg-background rounded transition-all"
                      title="Delete key"
                    >
                      <Trash2 size={16} className="text-text-muted hover:text-red-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <code className="text-text-muted font-mono">{key.masked_key}</code>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(key.status)}
                      <span className="text-text-secondary text-xs">
                        {getStatusLabel(key.status)}
                      </span>
                    </div>
                  </div>

                  {key.last_used && (
                    <div className="mt-2 text-xs text-text-muted">
                      Last used: {new Date(key.last_used).toLocaleString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Info */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-text-secondary">
            <p className="mb-2">
              <strong className="text-text-primary">How it works:</strong>
            </p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Keys are automatically detected by provider</li>
              <li>System rotates through keys on rate limits</li>
              <li>Rate-limited keys cool down for 60 seconds</li>
              <li>All keys are encrypted in the database</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}