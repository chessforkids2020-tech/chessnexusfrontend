
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api';
import socket from '../socket';
import { trackEvent } from '../lib/analytics';

const AuthContext = createContext({
  user: null,
  login: () => {},
  loginAsGuest: () => {},
  logout: () => {},
  refreshUser: () => {},
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  isElite: false,
  isGuest: false,
  unreadCount: 0,
  fetchUnreadCount: () => {}
});

export { AuthContext };

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const loadingRef = useRef(true);

  // Check auth on mount with timeout safety
  useEffect(() => {
    // Initial check should show spinner
    checkAuth({ showSpinner: true });
    
    // Timeout safety: if loading takes more than 10 seconds, force stop loading
    const timeoutId = setTimeout(() => {
      if (loadingRef.current) {
        setLoading(false);
        loadingRef.current = false;
        setUser(null);
        localStorage.removeItem('authToken');
      }
    }, 10000);
    
    return () => clearTimeout(timeoutId);
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

  const checkAuth = async ({ showSpinner = false } = {}) => {
    // showSpinner: when true, make the public `loading` state true so ProtectedRoute shows spinner
    const token = localStorage.getItem('authToken');
    
    if (showSpinner) {
      setLoading(true);
      loadingRef.current = true;
    }

    if (!token) {
      setUser(null);
      if (showSpinner) {
        setLoading(false);
        loadingRef.current = false;
      }
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      // Token invalid or expired or API error
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      if (showSpinner) {
        setLoading(false);
        loadingRef.current = false;
      }
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
      trackEvent('login', { method: 'password' });
      return response.data.user;
    }

    throw new Error(response.data.message || 'Login failed');
  };

  // Auto-create or reuse a guest identity. Token persists in localStorage.
  const loginAsGuest = async () => {
    // If we already have a token AND a guest user marker, reuse it
    const existingToken = localStorage.getItem('authToken');
    const existingGuestFlag = localStorage.getItem('isGuestUser');
    if (existingToken && existingGuestFlag === 'true' && user?.role === 'guest') {
      return user;
    }

    const response = await api.post('/api/auth/guest');
    if (response.data.ok && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('isGuestUser', 'true');
      setUser(response.data.user);
      return response.data.user;
    }
    throw new Error('Guest login failed');
  };

  const logout = async () => {
    try {
      const response = await api.post('/api/auth/logout');
      // Load 3D Arena in a hidden iframe so its JS runs and clears its own session.
      // A plain fetch() only downloads bytes — it never executes the arena's JS.
      const arenaLogoutUrl = response.data?.arenaLogoutUrl;
      if (arenaLogoutUrl) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = arenaLogoutUrl; // "https://3darena.chessnexus.in?logout=1"
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 3000); // give JS time to run, then clean up
      }
    } catch (error) {
      // Ignore logout API errors
    }
    
    // Clear auth state immediately
    localStorage.removeItem('authToken');
    localStorage.removeItem('isGuestUser');
    setUser(null);
    setUnreadCount(0);
    socket.disconnect();
  };

  // Expose a safe refreshUser that runs silently by default (no spinner)
  const refreshUser = async () => {
    try {
      await checkAuth({ showSpinner: false });
    } catch (err) {
    }
  };

  const value = {
    user,
    login,
    loginAsGuest,
    logout,
    refreshUser,
    loading,
    isAuthenticated: !!user && user.role !== 'guest',
    isAdmin: user?.role === 'admin',
    isElite: user?.role === 'elite',
    isGuest: user?.role === 'guest',
    unreadCount,
    fetchUnreadCount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
