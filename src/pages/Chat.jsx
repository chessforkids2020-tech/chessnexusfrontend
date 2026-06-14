import React, { useState, useEffect, useRef } from 'react';
import PlayerName from '../components/PlayerName';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import socket from '../socket';
import soundManager from '../utils/soundManager';
import './Chat.css';

const API = import.meta.env.VITE_API_URL;

function containsBlockedLink(text) {
  if (!text) return false;
  return /(?:https?:\/\/|www\.|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+(?:\/\S*)?)/i.test(text);
}

const Chat = () => {
  const { user, fetchUnreadCount } = useAuth();
  const location = useLocation();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const selectedChatRef = useRef(null); // always up-to-date ref for socket closures
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

  // Auto-open chat with a specific user when navigated with ?userId=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetUserId = params.get('userId');
    if (!targetUserId) return;
    // Clean URL immediately
    window.history.replaceState({}, '', location.pathname);
    // Get or create the direct chat then select it
    api.post('/api/chat/start', { userId: targetUserId })
      .then(res => {
        const chat = res.data;
        setChats(prev => {
          const exists = prev.some(c => c._id === chat._id);
          return exists ? prev : [chat, ...prev];
        });
        setSelectedChat(chat);
      })
      .catch(err => console.error('Auto-open chat error:', err));
  }, [location.search]); // eslint-disable-line

  // Join all chat rooms when chats are loaded
  useEffect(() => {
    if (chats.length > 0) {
      chats.forEach(chat => {
        socket.emit('join_chat', chat._id);
      });
    }
  }, [chats]);

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

  // Keep selectedChatRef in sync so socket handler always has fresh value
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Listen for incoming messages
  useEffect(() => {
    const handleReceiveMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      const currentUserId = user?._id || user?.id;
      const currentSelectedChat = selectedChatRef.current; // use ref — never stale

      // Play sound if message is from someone else
      if (currentUserId && senderId && String(senderId) !== String(currentUserId)) {
        playNotificationSound();
      }

      // If message belongs to the open chat, append it
      if (currentSelectedChat && message.chatId === currentSelectedChat._id) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex(msg =>
            msg._id === message._id ||
            (msg.isOptimistic && msg.sender._id === message.sender._id && msg.content === message.content)
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = message;
            return updated;
          }
          return [...prev, message];
        });
        scrollToBottom();
      }

      // Update chat list — bubble to top (WhatsApp style)
      setChats((prevChats) => {
        const list = Array.isArray(prevChats) ? prevChats : [];
        const isFromOther = currentUserId && senderId && String(senderId) !== String(currentUserId);
        const exists = list.some(c => c._id === message.chatId);

        let updated;
        if (exists) {
          updated = list.map(chat => {
            if (chat._id !== message.chatId) return chat;
            const isOpen = currentSelectedChat && currentSelectedChat._id === chat._id;
            const newUnread = isFromOther && !isOpen ? (chat.unreadCount || 0) + 1 : (chat.unreadCount || 0);
            return { ...chat, lastMessage: message, updatedAt: new Date(), unreadCount: newUnread };
          });
        } else {
          // New chat not yet in list — add a stub and re-fetch to get full details
          const stub = {
            _id: message.chatId,
            lastMessage: message,
            updatedAt: new Date(),
            unreadCount: isFromOther ? 1 : 0
          };
          updated = [stub, ...list];
          // Refresh full chat list in background to fill in name/avatar
          api.get('/api/chat').then(res => {
            const fresh = Array.isArray(res.data) ? res.data : [];
            setChats(fresh.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
          }).catch(() => {});
        }

        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('receive_message', handleReceiveMessage);
    return () => socket.off('receive_message', handleReceiveMessage);
  }, [user, isMuted]); // removed selectedChat — using ref instead to avoid stale closures

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
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
    if (!newMessage.trim() || !selectedChat || containsBlockedLink(newMessage)) return;

    const messageContent = newMessage.trim();
    
    // Optimistically add message to UI immediately
    const optimisticMessage = {
      _id: `temp-${Date.now()}`, // Temporary ID
      chatId: selectedChat._id,
      sender: {
        _id: user._id || user.id,
        username: user.username,
        displayName: user.displayName || user.username
      }, // Match the structure of real messages
      content: messageContent,
      createdAt: new Date(),
      isOptimistic: true // Flag to identify optimistic messages
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();

    // Immediately bubble this chat to the top of the list (sender side)
    const now = new Date();
    setChats(prev => {
      const updated = prev.map(c =>
        c._id === selectedChat._id
          ? { ...c, lastMessage: optimisticMessage, updatedAt: now }
          : c
      );
      return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });

    try {
      const response = await api.post(`/api/chat/${selectedChat._id}/messages`, {
        content: messageContent
      });
      
      // Replace optimistic message with real message from server
      setMessages((prev) => 
        prev.map(msg => 
          msg.isOptimistic && msg.content === messageContent && 
          String(msg.sender._id) === String(user._id || user.id) ? response.data : msg
        )
      );
    } catch (error) {
      // Remove optimistic message on error
      setMessages((prev) => 
        prev.filter(msg => !(msg.isOptimistic && msg.content === messageContent && 
                           String(msg.sender._id) === String(user._id || user.id)))
      );
      // Optionally restore the input
      setNewMessage(messageContent);
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
  const hasBlockedLink = containsBlockedLink(newMessage);

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
            <button onClick={() => setShowGroupModal(true)} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8em' }}>Grp</button>
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
                    {String(chat.lastMessage.sender?._id ?? chat.lastMessage.sender ?? '') === String(user?._id || user?.id) ? 'You: ' : ''}
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
                <button 
                    className="btn-primary" 
                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                    onClick={() => setShowAddUserModal(true)}
                  >
                    + User
                  </button>
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
          <button type="submit" className="send-button" disabled={!selectedChat || !newMessage.trim() || hasBlockedLink}>
            Send
          </button>
        </form>
        {selectedChat && hasBlockedLink && (
          <div style={{ color: '#ef4444', fontSize: 12, padding: '0 12px 10px' }}>
            Links are not allowed in chat messages.
          </div>
        )}
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
                  {u.role === 'admin' ? 'chessnexus' : <PlayerName displayName={u.displayName} username={u.username} />}
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
                    <span>{u.role === 'admin' ? 'chessnexus' : <PlayerName displayName={u.displayName} username={u.username} />}</span>
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
                  <span>{u.role === 'admin' ? 'chessnexus' : <PlayerName displayName={u.displayName} username={u.username} />}</span>
                  <button 
                    className="btn-primary btn-remove-small" 
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
                  <span>{p.role === 'admin' ? 'chessnexus' : <PlayerName displayName={p.displayName} username={p.username} />} {String(p._id) === String(user._id || user.id) ? '(You)' : ''}</span>
                  {user?.role === 'admin' && String(p._id) !== String(user._id || user.id) && (
                    <button 
                      className="btn-primary btn-remove-small" 
                      style={{ backgroundColor: '#ff4d4d' }}
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
