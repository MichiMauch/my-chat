'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Send } from 'lucide-react';
import ably from '@/lib/ably';

interface CurrentUser {
  id: number;
  username: string;
  created_at: string;
}

interface DirectMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  senderUsername: string;
  receiverUsername: string;
}

interface DirectMessageAreaProps {
  currentUser: CurrentUser;
  otherUser: CurrentUser;
}

export default function DirectMessageArea({ currentUser, otherUser }: DirectMessageAreaProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (otherUser) {
      loadMessages();
      setupAbly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUser]);

  const loadMessages = async () => {
    if (!otherUser) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/direct-messages?userId=${currentUser.id}&otherUserId=${otherUser.id}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load direct messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupAbly = () => {
    if (!otherUser) return;

    const channelName = `dm-${Math.min(currentUser.id, otherUser.id)}-${Math.max(currentUser.id, otherUser.id)}`;
    const channel = ably.channels.get(channelName);
    
    channel.subscribe('message', (message) => {
      const messageData = message.data;
      // Only add messages from other user, not own messages
      if (messageData.senderId !== currentUser.id) {
        setMessages((prev) => [...prev, messageData]);
      }
    });

    channel.subscribe('typing', (message) => {
      const { username, isTyping } = message.data;
      
      if (username === currentUser.username) return;
      
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    });

    return () => {
      channel.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: otherUser.id,
          message: messageText,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Add own message locally immediately
        setMessages((prev) => [...prev, data.directMessage]);
        
        // Broadcast to other user via Ably
        const channelName = `dm-${Math.min(currentUser.id, otherUser.id)}-${Math.max(currentUser.id, otherUser.id)}`;
        const channel = ably.channels.get(channelName);
        channel.publish('message', data.directMessage);
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
      setNewMessage(messageText);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!otherUser) return;
    
    const channelName = `dm-${Math.min(currentUser.id, otherUser.id)}-${Math.max(currentUser.id, otherUser.id)}`;
    const channel = ably.channels.get(channelName);
    channel.publish('typing', {
      username: currentUser.username,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channel.publish('typing', {
        username: currentUser.username,
        isTyping: false,
      });
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <User className="w-5 h-5 text-gray-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {otherUser.username}
            </h1>
            <p className="text-sm text-gray-500">Direct Message</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>Start a private conversation with {otherUser.username}</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={`dm-${msg.id}-${msg.senderId}-${msg.receiverId}-${index}`}
                  className={`flex ${
                    msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderId === currentUser.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {msg.senderId === currentUser.id ? 'You' : otherUser.username}
                    </div>
                    <div>{msg.message}</div>
                    <div className="text-xs opacity-50 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {typingUsers.size > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm">
                  {otherUser.username} is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-gray-200 bg-white p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder={`Message ${otherUser.username}`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}