import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (orgId) => {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      // console.log('[Socket.IO] Connected to backend server:', socket.id);
      if (orgId) {
        socket.emit('org:join', orgId);
      }
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
