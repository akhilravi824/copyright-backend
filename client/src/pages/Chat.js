import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Send, Users, Trash2, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [showActiveUsers, setShowActiveUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery(
    ['chat-messages', selectedUser?.id],
    () => {
      const params = selectedUser?.id ? `?recipient_id=${selectedUser.id}` : '';
      return api.get(`/api/chat/messages${params}`).then(res => res.data);
    },
    {
      refetchInterval: 3000,
      refetchIntervalInBackground: true
    }
  );

  // Fetch all users with their online status
  const { data: activeUsersData } = useQuery(
    ['active-users'],
    () => api.get('/api/chat/active-users').then(res => res.data),
    {
      refetchInterval: 10000,
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
    () => api.post('/api/chat/presence')
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // Update presence every 30 seconds
  useEffect(() => {
    updatePresenceMutation.mutate();
    const interval = setInterval(() => {
      updatePresenceMutation.mutate();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Team Chat</h1>
        <p className="mt-2 text-gray-600">
          Communicate with your team in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-6rem)]">
        {/* Users Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Users</h2>
            </div>
            {activeUsersData?.users && (
              <p className="text-xs text-blue-100 mt-1">
                {activeUsersData.users.filter(u => u.isOnline).length} online • {activeUsersData.users.length} total
              </p>
            )}
          </div>
          
          <div className="p-4">
            {selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full mb-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
              >
                ← Back to Group Chat
              </button>
            )}
            
            <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
              {activeUsersData?.users?.map((activeUser) => (
                <button
                  key={activeUser.id}
                  onClick={() => setSelectedUser(activeUser)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    selectedUser?.id === activeUser.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${activeUser.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activeUser.firstName} {activeUser.lastName}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(activeUser.role)}`}>
                        {activeUser.role}
                      </span>
                      {!activeUser.isOnline && (
                        <span className="text-xs text-gray-400">• offline</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {(!activeUsersData?.users || activeUsersData.users.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No users found</p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-6 w-6" />
              <div className="flex-1">
                {selectedUser ? (
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h2>
                    <p className="text-sm text-blue-100">
                      {selectedUser.role} • {selectedUser.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold">Group Chat</h2>
                    <p className="text-sm text-blue-100">
                      Everyone can see these messages
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : messagesData?.messages?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messagesData?.messages?.map((msg) => {
                const isOwnMessage = msg.user?.email === user?.email;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isOwnMessage && (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-semibold text-gray-700">
                            {msg.user?.firstName} {msg.user?.lastName}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(msg.user?.role)}`}>
                            {msg.user?.role}
                          </span>
                        </div>
                      )}
                      <div
                        className={`group relative rounded-lg px-4 py-3 ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                        }`}
                      >
                        <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                        <div className="flex items-center justify-between mt-2 space-x-3">
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

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            {selectedUser && (
              <div className="mb-3 text-sm text-gray-600 flex items-center justify-between">
                <span>
                  Private message to <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
                </span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedUser ? `Message ${selectedUser.firstName}...` : "Message everyone..."}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sendMessageMutation.isLoading}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendMessageMutation.isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {sendMessageMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;


