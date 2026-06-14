/**
 * Socket.IO Client - JWT Authentication
 * Optimized for Vercel + Render deployment
 * No cookies needed - works on ALL browsers
 */

import { io } from "socket.io-client";

// Production-safe API URL - fallback to window.location.origin if env var not set
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const getToken = () => localStorage.getItem('authToken');

const socket = io(API_URL, {
  autoConnect: false,
  // Optimize for production: polling first for reliability on Vercel + Render
  transports: ["polling", "websocket"],
  // Enhanced reconnection settings for production
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 15,
  timeout: 60000,
  upgrade: true,
  rememberUpgrade: false,
  auth: {
    token: getToken()
  }
});

// Update token on each reconnection attempt
socket.on('reconnect_attempt', () => {
  socket.auth = { token: getToken() };
});

// Override connect to always use fresh token
const originalConnect = socket.connect.bind(socket);
socket.connect = () => {
  socket.auth = { token: getToken() };
  return originalConnect();
};

// Production debugging logs
socket.on('connect', () => {
  console.log('🔗 [Socket] Connected via', socket.io.engine.transport.name);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 [Socket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ [Socket] Connection error:', error.message);
});

export default socket;
