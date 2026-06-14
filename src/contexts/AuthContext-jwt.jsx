/**
 * AuthContext - Pure JWT Authentication
 * No cookies, no browser-specific workarounds
 * Works on ALL browsers including Safari/iPad
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import socket from '../socket';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Connect socket when authenticated
  useEffect(() => {
    if (user) {
      socket.connect();
      fetchUnreadCount();
    } else {
      socket.disconnect();
    }
  }, [user]);

  // Listen for new messages
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (message) => {
      const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
      if (senderId !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('receive_message', handleNewMessage);
    return () => socket.off('receive_message', handleNewMessage);
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      // Token invalid or expired
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/chat/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
    }
  };

  const login = async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    
    if (response.data.ok && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      setUser(response.data.user);
      return response.data.user;
    }
    
    throw new Error(response.data.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout API errors
    }
    
    localStorage.removeItem('authToken');
    setUser(null);
    socket.disconnect();
  };

  const value = {
    user,
    login,
    logout,
    refreshUser: checkAuth,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    unreadCount,
    fetchUnreadCount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
