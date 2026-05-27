import React, { useRef, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useModeStore } from '../stores/modeStore';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { Sparkles } from 'lucide-react';

export default function ChatCanvas() {
  const { currentSession, messages } = useSessionStore();
  const { currentMode } = useModeStore();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" data-testid="empty-state">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            Welcome to NEXUS
          </h2>
          <p className="text-text-secondary">
            Select an AI mode to start a new conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full" data-testid="chat-canvas">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-12 py-8">
        <div className="max-w-[780px] mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12" data-testid="no-messages">
              <p className="text-text-secondary">
                Start the conversation...
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                mode={currentMode}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 px-12 py-6 bg-surface/50 backdrop-blur-sm">
        <div className="max-w-[780px] mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}