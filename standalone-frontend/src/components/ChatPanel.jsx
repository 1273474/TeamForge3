import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ChatPanel({ teamId, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetchMessages();
    
    // Join team room for real-time updates
    if (socket) {
      socket.emit('join-team', teamId);
      
      // Listen for new messages
      socket.on('message-received', handleNewMessage);
      
      // Listen for typing indicators
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);
      
      return () => {
        socket.emit('leave-team', teamId);
        socket.off('message-received', handleNewMessage);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stopped-typing', handleUserStoppedTyping);
      };
    }
    
    // Fallback polling if socket is not available
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [teamId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/${teamId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (messageData) => {
    if (messageData.teamId === parseInt(teamId)) {
      setMessages(prev => [...prev, messageData.message]);
    }
  };

  const handleUserTyping = (data) => {
    if (data.teamId === parseInt(teamId) && data.userId !== user.id) {
      setTypingUsers(prev => new Set([...prev, data.userId]));
    }
  };

  const handleUserStoppedTyping = (data) => {
    if (data.teamId === parseInt(teamId)) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const response = await api.post(`/messages/${teamId}`, { 
        content: messageContent,
        mentioned_users: messageContent.includes('@ai') ? ['ai'] : undefined
      });

      // Add message optimistically
      setMessages(prev => [...prev, response.data]);

      // Emit to socket for real-time updates
      if (socket) {
        socket.emit('new-message', {
          teamId: parseInt(teamId),
          message: response.data
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing-start', { teamId: parseInt(teamId) });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { teamId: parseInt(teamId) });
      }, 2000);
    }
  };

  const formatMessage = (content) => {
    // Format code blocks and mentions
    return content
      .replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/@(\w+)/g, '<span class="text-purple-400 font-medium">@$1</span>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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
              className={`flex space-x-3 animate-fade-in ${
                message.message_type === 'ai' ? 'bg-purple-500/10 rounded-lg p-4' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {message.message_type === 'ai' ? (
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                ) : message.user_picture ? (
                  <img 
                    src={message.user_picture} 
                    alt={message.user_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-white">
                    {message.message_type === 'ai' 
                      ? 'AI Assistant' 
                      : message.user_name || `User ${message.user_id?.slice(-6)}`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(message.created_at)}
                  </span>
                </div>
                <div 
                  className="text-gray-300 break-words prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-white/10 p-6">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message... (use @ai for AI assistance)"
            className="flex-1 input-field"
            disabled={sending}
            maxLength={5000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary flex items-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-400">
          <strong>Tips:</strong> Use @ai to get AI assistance • Type "summarize" with @ai to get a conversation summary • Mention @username to assign tasks
        </div>
      </div>
    </div>
  );
}
