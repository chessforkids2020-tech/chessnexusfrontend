import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import socket from '../socket';
import soundManager from '../utils/soundManager';
import './Chat.css';

const API = import.meta.env.VITE_API_URL;

const Chat = () => {
  const { user, fetchUnreadCount } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef(null);
  
  const playNotificationSound = () => {
    if (isMuted) return;
    soundManager.play('notification');
  };

  // Connect socket on mount
  useEffect(() => {
    if (user) {
      socket.connect();
      
      // Ensure authentication for socket
      // Server handles authentication via JWT token in socket handshake
    }

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch chats
  useEffect(() => {
    fetchChats();
  }, []);

  // Ref for chat list to preserve scroll position when selecting
  const chatListRef = useRef(null);

  // Sort: most recently active chat always at top (WhatsApp style)
  const sortChats = (list) => [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const fetchChats = async () => {
    try {
      const response = await api.get(`/api/chat`);
      const data = Array.isArray(response.data) ? response.data : [];
      setChats(sortChats(data));
    } catch (error) {
      setChats([]);
    }
  };

  // Listen for incoming messages
  useEffect(() => {
    const handleReceiveMessage = (message) => {
      // Play sound if message is from someone else
      const senderId = message.sender?._id || message.sender;
      const currentUserId = user?._id || user?.id;
      if (currentUserId && senderId && String(senderId) !== String(currentUserId)) {
        playNotificationSound();
      }

      // If message belongs to current chat, append it
      if (selectedChat && message.chatId === selectedChat._id) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
      
      // Update chat list (last message preview + unread count)
      setChats((prevChats) => {
        const chatsToMap = Array.isArray(prevChats) ? prevChats : [];
        const isFromOther = currentUserId && senderId && String(senderId) !== String(currentUserId);
        const updatedChats = chatsToMap.map(chat => {
          if (chat._id === message.chatId) {
            const isOpen = selectedChat && selectedChat._id === chat._id;
            const newUnread = isFromOther && !isOpen ? (chat.unreadCount || 0) + 1 : (chat.unreadCount || 0);
            return { ...chat, lastMessage: message, updatedAt: new Date(), unreadCount: newUnread };
          }
          return chat;
        });
        // Sort: most recently active chat always at top (WhatsApp style)
        return updatedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [selectedChat, user, isMuted]); // Added user and isMuted to ensure closure has latest values

  // Join chat room when selected
  useEffect(() => {
    if (selectedChat) {
      socket.emit('join_chat', selectedChat._id);
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat]);

  // When no chat is selected, clear messages to show the "Select a chat" empty state
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setLoadingMessages(false);
      setNewMessage('');
    }
  }, [selectedChat]);

  const fetchMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      // Clear previous messages first to prevent flickering
      setMessages([]);
      
      // Mark messages as read
      await api.put(`/api/chat/${chatId}/read`, {});
      // Refresh global unread count
      fetchUnreadCount();
      // Clear this chat's unread badge immediately
      setChats(prev => prev.map(c => c._id === chatId ? { ...c, unreadCount: 0 } : c));

      const response = await api.get(`/api/chat/${chatId}/messages`);
      const fetchedMessages = response.data || [];
      
      // Ensure messages have proper structure
      const validMessages = fetchedMessages.filter(msg => msg && msg.content);
      
      setMessages(validMessages);
      scrollToBottom();
    } catch (error) {
      setMessages([]); // Clear messages on error
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    // Use multiple attempts to ensure scrolling works
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    }, 100);
    
    // Additional scroll attempt for reliability
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto',
          block: 'end'
        });
      }
    }, 300);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await api.post(`/api/chat/${selectedChat._id}/messages`, {
        content: newMessage
      });
      
      // Message is added via socket event 'receive_message' usually, 
      // but we can also add it optimistically or wait for socket.
      // Since our backend emits to sender too, we can just wait for socket.
      // However, to feel instant, let's add it if we don't get it from socket immediately?
      // Actually, let's rely on socket for consistency, or add it manually if we want.
      // The backend emits to the room, and sender is in the room.
      
      setNewMessage('');
    } catch (error) {
    }
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/api/chat/users/search?query=${query}`);
      setSearchResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setSearchResults([]);
    }
  };

  const startIndividualChat = async (targetUserId) => {
    try {
      const response = await api.post(`/api/chat/start`, { userId: targetUserId });
      const chat = response.data;
      
      // Check if chat already exists in list
      const existingChat = chats.find(c => c._id === chat._id);
      if (!existingChat) {
        setChats([chat, ...chats]);
      }
      
      setSelectedChat(chat);
      setShowNewChatModal(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Fetch the chat list again to ensure we have all chats
      fetchChats();
    } catch (error) {
      alert('Failed to start chat: ' + (error.response?.data?.message || error.message));
    }
  };

  const createGroupChat = async () => {
    if (!groupName || groupParticipants.length === 0) return;

    try {
      const response = await api.post(`/api/chat/group`, {
        name: groupName,
        participantIds: groupParticipants.map(u => u._id)
      });
      
      const chat = response.data;
      setChats([chat, ...chats]);
      setSelectedChat(chat);
      setShowGroupModal(false);
      setGroupName('');
      setGroupParticipants([]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
    }
  };

  const toggleGroupParticipant = (user) => {
    if (groupParticipants.find(p => p._id === user._id)) {
      setGroupParticipants(groupParticipants.filter(p => p._id !== user._id));
    } else {
      setGroupParticipants([...groupParticipants, user]);
    }
  };

  const handleAddUserToGroup = async (targetUser) => {
    if (!selectedChat || selectedChat.type !== 'group') return;

    try {
      const response = await api.put(`/api/chat/${selectedChat._id}/add-user`, {
        userId: targetUser._id
      });
      
      const updatedChat = response.data;
      
      // Update chats list
      setChats(chats.map(c => c._id === updatedChat._id ? updatedChat : c));
      setSelectedChat(updatedChat);
      
      setShowAddUserModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
    }
  };
  
  const handleRemoveUserFromGroup = async (targetUserId) => {
    if (!selectedChat || selectedChat.type !== 'group') return;
    
    // Don't allow removing self if admin (unless we want that)
    if (String(targetUserId) === String(user._id || user.id)) {
      alert("You cannot remove yourself from the group.");
      return;
    }

    try {
      const response = await api.put(`/api/chat/${selectedChat._id}/remove-user`, {
        userId: targetUserId
      });
      
      const updatedChat = response.data;
      
      setChats(chats.map(c => c._id === updatedChat._id ? updatedChat : c));
      setSelectedChat(updatedChat);
    } catch (error) {
    }
  };

  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.name;
    // For individual, find the other participant
    if (!user || !chat.participants) return 'Unknown';
    const userId = user._id || user.id;
    const other = chat.participants.find(p => String(p._id) !== String(userId));
    return other ? (other.role === 'admin' ? 'chessnexus' : (other.displayName || other.username)) : 'Unknown';
  };

  const getSenderName = (sender) => {
    if (!sender) return 'Unknown';
    if (sender.role === 'admin') return 'chessnexus';
    return sender.displayName || sender.username;
  };

  const isSender = (msg) => {
    if (!user || !msg.sender) return false;
    const senderId = msg.sender._id || msg.sender;
    const userId = user._id || user.id;
    return String(senderId) === String(userId);
  };

  // Determine messages area classes (loading state only)
  const messagesAreaClass = `messages-area ${loadingMessages ? 'loading' : ''}`;
  // sizeMode: 'compact' (small) or 'expanded' (2x compact)
  const [sizeMode, setSizeMode] = useState('expanded');

  // Determine whether inner messages content should be vertically centered
  const shouldCenterMessagesInner = loadingMessages || (!loadingMessages && (!selectedChat || messages.length === 0 || messages.length < 4));

  return (
    <div className={`chat-container ${sizeMode === 'compact' ? 'compact' : sizeMode === 'expanded' ? 'expanded' : ''}`}>
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Chats</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '0.8em' }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button onClick={() => setShowNewChatModal(true)} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8em' }}>+ New</button>
            {user?.role === 'admin' && (
              <button onClick={() => setShowGroupModal(true)} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8em' }}>Grp</button>
            )}
          </div>
        </div>
        <div className="chat-list" ref={chatListRef}>
          {chats.map(chat => (
            <div 
              key={chat._id} 
              className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''} ${(chat.unreadCount || 0) > 0 && selectedChat?._id !== chat._id ? 'unread' : ''}`}
              onClick={() => {
                // Preserve scroll position of the chat list so items do not jump/hide
                const scrollTop = chatListRef.current?.scrollTop;
                setSelectedChat(chat);
                // Restore scroll position after the render completes
                setTimeout(() => {
                  if (chatListRef.current && typeof scrollTop === 'number') chatListRef.current.scrollTop = scrollTop;
                }, 0);
              }}
            >
              <div className="chat-item-name-row">
                <div className="chat-item-name" title={getChatName(chat)}>{getChatName(chat)}</div>
                {(chat.unreadCount || 0) > 0 && selectedChat?._id !== chat._id && (
                  <span className="unread-badge">{chat.unreadCount}</span>
                )}
              </div>
              <div className="chat-item-preview" title={chat.lastMessage ? (chat.lastMessage.content || '') : 'No messages yet'}>
                {chat.lastMessage ? (
                  <span>
                    {String(chat.lastMessage.sender._id || chat.lastMessage.sender) === String(user._id || user.id) ? 'You: ' : ''}
                    {chat.lastMessage.content}
                  </span>
                ) : (
                  'No messages yet'
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Always render header to keep layout stable */}
        <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{selectedChat ? getChatName(selectedChat) : 'Select a chat'}</div>
            {selectedChat && selectedChat.type === 'group' && (
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ fontSize: '0.8em', padding: '4px 8px' }}
                  onClick={() => setShowParticipantsModal(true)}
                >
                  Participants ({selectedChat.participants?.length || 0})
                </button>
                {user?.role === 'admin' && (
                  <button 
                    className="btn-primary" 
                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                    onClick={() => setShowAddUserModal(true)}
                  >
                    + User
                  </button>
                )}
              </div>
            )}
          </div>

        {/* Messages area: either messages, loading, or empty prompt */}
        <div className={messagesAreaClass}>
          <div className={`messages-inner ${shouldCenterMessagesInner ? 'centered' : ''}`}>
            {loadingMessages ? (
              <div className="loading-messages">Loading messages...</div>
            ) : (!selectedChat ? (
              <div className="empty-messages">Select a chat to view messages</div>
            ) : messages.length === 0 ? (
              <div className="empty-messages">No messages yet. Start the conversation!</div>
            ) : (
              messages.map((msg, index) => (
                <div key={msg._id || index} className={`message ${isSender(msg) ? 'sent' : 'received'}`}>
                  <div className="message-sender">{!isSender(msg) && getSenderName(msg.sender)}</div>
                  <div className="message-content" title={msg.content}>{msg.content}</div>
                </div>
              ))
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Always render input but disable when no chat selected */}
        <form className="message-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="message-input"
            placeholder={selectedChat ? 'Type a message...' : 'Select a chat to start messaging'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!selectedChat}
          />
          <button type="submit" className="send-button" disabled={!selectedChat || !newMessage.trim()}>
            Send
          </button>
        </form>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>New Chat</h3>
            <input
              type="text"
              className="search-input"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
            <div className="user-list">
              {searchResults.map(u => (
                <div key={u._id} className="user-list-item" onClick={() => startIndividualChat(u._id)}>
                  {u.role === 'admin' ? 'chessnexus' : (u.displayName || u.username)}
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setShowNewChatModal(false)} style={{ marginTop: '10px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add User to Group Modal (Admin Only) */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add User to Group</h3>
            <input
              type="text"
              className="search-input"
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
            <div className="user-list">
              {searchResults.map(u => {
                // Check if user is already in the group
                const isAlreadyInGroup = selectedChat.participants.some(p => p._id === u._id);
                
                return (
                  <div 
                    key={u._id} 
                    className="user-list-item" 
                    onClick={() => !isAlreadyInGroup && handleAddUserToGroup(u)}
                    style={{ opacity: isAlreadyInGroup ? 0.5 : 1, cursor: isAlreadyInGroup ? 'default' : 'pointer' }}
                  >
                    <span>{u.role === 'admin' ? 'chessnexus' : (u.displayName || u.username)}</span>
                    {isAlreadyInGroup && <span style={{ fontSize: '0.8em', color: '#888' }}>(Joined)</span>}
                  </div>
                );
              })}
            </div>
            <button className="btn-secondary" onClick={() => setShowAddUserModal(false)} style={{ marginTop: '10px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Group Chat Modal (Admin Only) */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Create Group Chat</h3>
            <input
              type="text"
              className="search-input"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <input
              type="text"
              className="search-input"
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
            <div style={{ marginBottom: '10px' }}>
              <strong>Selected:</strong> {groupParticipants.map(p => p.displayName || p.username).join(', ')}
            </div>
            <div className="user-list">
              {searchResults.map(u => (
                <div key={u._id} className="user-list-item">
                  <span>{u.role === 'admin' ? 'chessnexus' : (u.displayName || u.username)}</span>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '2px 8px', fontSize: '0.8em' }}
                    onClick={() => toggleGroupParticipant(u)}
                  >
                    {groupParticipants.find(p => p._id === u._id) ? 'Remove' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowGroupModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createGroupChat}>Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedChat && (
        <div className="modal-overlay" onClick={() => setShowParticipantsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Group Participants</h3>
            <div className="user-list">
              {selectedChat.participants?.map(p => (
                <div key={p._id} className="user-list-item" style={{ justifyContent: 'space-between' }}>
                  <span>{p.role === 'admin' ? 'chessnexus' : (p.displayName || p.username)} {String(p._id) === String(user._id || user.id) ? '(You)' : ''}</span>
                  {user?.role === 'admin' && String(p._id) !== String(user._id || user.id) && (
                    <button 
                      className="btn-primary" 
                      style={{ padding: '2px 8px', fontSize: '0.8em', backgroundColor: '#ff4d4d' }}
                      onClick={() => handleRemoveUserFromGroup(p._id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setShowParticipantsModal(false)} style={{ marginTop: '10px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
