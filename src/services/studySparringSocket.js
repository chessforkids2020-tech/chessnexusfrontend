import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
const getToken = () => localStorage.getItem('authToken');

let _socket = null;

function getSocket() {
  if (!_socket || !_socket.connected) {
    _socket = io(`${API_URL}/studysparring`, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      timeout: 60000,
      auth: { token: getToken() }
    });

    _socket.on('reconnect_attempt', () => {
      _socket.auth = { token: getToken() };
    });
  }
  return _socket;
}

const studySparringSocket = {
  connect() {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
  },

  disconnect() {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
  },

  emit(event, data) {
    getSocket().emit(event, data);
  },

  on(event, cb) {
    getSocket().on(event, cb);
  },

  off(event, cb) {
    if (_socket) _socket.off(event, cb);
  },

  once(event, cb) {
    getSocket().once(event, cb);
  },

  get id() {
    return _socket?.id;
  },

  get connected() {
    return !!_socket?.connected;
  }
};

export default studySparringSocket;
