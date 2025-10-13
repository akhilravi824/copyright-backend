import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { X, Send, Users, Trash2, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';

const Chat = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [showActiveUsers, setShowActiveUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); // null = group chat, user object = DM
  const messagesEndRef = useRef(null);

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery(
    ['chat-messages', selectedUser?.id],
    () => {
      const params = selectedUser?.id ? `?recipient_id=${selectedUser.id}` : '';
      return api.get(`/api/chat/messages${params}`).then(res => res.data);
    },
    {
      enabled: isOpen,
      refetchInterval: 3000, // Poll every 3 seconds for new messages
      refetchIntervalInBackground: true
    }
  );

  // Fetch active users
  const { data: activeUsersData } = useQuery(
    ['active-users'],
    () => api.get('/api/chat/active-users').then(res => res.data),
    {
      enabled: isOpen && showActiveUsers,
      refetchInterval: 10000, // Poll every 10 seconds
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    (message) => api.post('/api/chat/messages', { 
      message,
      recipient_id: selectedUser?.id || null
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat-messages']);
        setNewMessage('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send message');
      }
    }
  );

  // Delete message mutation
  const deleteMessageMutation = useMutation(
    (messageId) => api.delete(`/api/chat/messages/${messageId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat-messages']);
        toast.success('Message deleted');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete message');
      }
    }
  );

  // Update presence mutation
  const updatePresenceMutation = useMutation(
    () => api.post('/api/chat/presence'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['active-users']);
      }
    }
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // Update presence every 30 seconds
  useEffect(() => {
    if (isOpen) {
      updatePresenceMutation.mutate();
      const interval = setInterval(() => {
        updatePresenceMutation.mutate();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage);
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      analyst: 'bg-green-100 text-green-800',
      staff: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.staff;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <MessageCircle className="h-5 w-5" />
          <div className="flex-1">
            {selectedUser ? (
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-xs text-blue-100">
                  {selectedUser.role} • {selectedUser.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold">Team Chat</h2>
                {activeUsersData?.users && (
                  <p className="text-xs text-blue-100">
                    {activeUsersData.users.length} online
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowActiveUsers(!showActiveUsers)}
            className={`p-1.5 rounded-lg transition-colors ${showActiveUsers ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
            title="Active Users"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Active Users Panel */}
      {showActiveUsers && (
        <div className="bg-blue-50 border-b border-blue-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">SELECT USER TO CHAT</h3>
            {selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Group Chat
              </button>
            )}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activeUsersData?.users
              ?.filter(activeUser => activeUser.email !== user?.email) // Don't show yourself
              ?.map((activeUser) => (
                <button
                  key={activeUser.id}
                  onClick={() => {
                    setSelectedUser(activeUser);
                    setShowActiveUsers(false);
                  }}
                  className={`w-full flex items-center space-x-2 text-sm p-2 rounded-lg transition-colors ${
                    selectedUser?.id === activeUser.id
                      ? 'bg-blue-200 hover:bg-blue-300'
                      : 'hover:bg-blue-100'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeUser.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-gray-900 font-medium flex-1 text-left truncate">
                    {activeUser.firstName} {activeUser.lastName}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getRoleBadgeColor(activeUser.role)}`}>
                    {activeUser.role}
                  </span>
                </button>
              ))}
            {(!activeUsersData?.users || activeUsersData.users.filter(u => u.email !== user?.email).length === 0) && (
              <p className="text-xs text-gray-500 text-center py-2">No other users online</p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messagesData?.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          messagesData?.messages?.map((msg) => {
            const isOwnMessage = msg.user?.email === user?.email;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwnMessage && (
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {msg.user?.firstName} {msg.user?.lastName}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(msg.user?.role)}`}>
                        {msg.user?.role}
                      </span>
                    </div>
                  )}
                  <div
                    className={`group relative rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.message}</p>
                    <div className="flex items-center justify-between mt-1 space-x-2">
                      <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOwnMessage && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3 text-blue-100 hover:text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {selectedUser ? (
          <div className="mb-2 text-xs text-gray-600 flex items-center justify-between">
            <span>
              Chatting with <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
            </span>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              Switch to Group Chat
            </button>
          </div>
        ) : (
          <div className="mb-2 text-xs text-gray-600 text-center">
            <span className="font-semibold">Group Chat</span> - Everyone can see these messages
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedUser ? `Message ${selectedUser.firstName}...` : "Message everyone..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sendMessageMutation.isLoading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendMessageMutation.isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;

