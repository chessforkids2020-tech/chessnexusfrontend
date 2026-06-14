
import { io } from "socket.io-client";

// Production-safe API URL - fallback to window.location.origin if env var not set
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const getToken = () => localStorage.getItem('authToken');

const socket = io(API_URL, {
  autoConnect: false,
  // Optimize for Vercel + Render: polling first for reliability
  transports: ["polling", "websocket"],
  // Enhanced reconnection for production environments
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000, // Increased for slower connections
  reconnectionAttempts: 15, // More attempts for reliability
  timeout: 60000, // Longer timeout for production
  upgrade: true,
  rememberUpgrade: false, // Don't remember to prevent issues
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

// Enhanced logging for debugging production issues
socket.on('connect', () => {
  console.log('🔗 [Socket] Connected successfully via', socket.io.engine.transport.name);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 [Socket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ [Socket] Connection error:', error.message);
});

export default socket;
