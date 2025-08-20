import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import type { Message } from '@/shared/types';
import type { MochaUser } from '@getmocha/users-service/shared';

interface ChatPanelProps {
  teamId: number;
  user: MochaUser;
}

export default function ChatPanel({ teamId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 2 seconds (simple polling for MVP)
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [teamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: messageContent,
          mentioned_users: messageContent.includes('@ai') ? ['ai'] : undefined
        }),
      });

      if (response.ok) {
        // Refresh messages immediately after sending
        setTimeout(fetchMessages, 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatMessage = (content: string) => {
    // Simple formatting for code blocks and mentions
    return content
      .replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/@(\w+)/g, '<span class="text-purple-400 font-medium">@$1</span>');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <MessageSquare className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No messages yet</h3>
            <p className="text-gray-300">Start the conversation! You can mention @ai for assistance.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex space-x-3 ${
                message.message_type === 'ai' ? 'bg-purple-500/10 rounded-lg p-4' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {message.message_type === 'ai' ? (
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-white">
                    {message.message_type === 'ai' ? 'AI Assistant' : `User ${message.user_id?.slice(-6)}`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div 
                  className="text-gray-300 break-words"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-white/10 p-6">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message... (use @ai for AI assistance)"
            className="flex-1 bg-slate-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-400">
          <strong>Tips:</strong> Use @ai to get AI assistance • Type "summarize" with @ai to get a conversation summary
        </div>
      </div>
    </div>
  );
}
