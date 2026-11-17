export const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    // console.log(`[Socket.IO] New client connected: ${socket.id}`);

    // Join organization room for real-time tenant updates
    socket.on('org:join', (orgId) => {
      if (orgId) {
        socket.join(orgId.toString());
        // console.log(`[Socket.IO] Socket ${socket.id} joined org room: ${orgId}`);
      }
    });

    // Join specific ticket room for live chat updates
    socket.on('ticket:join', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket:${ticketId}`);
      }
    });

    socket.on('ticket:leave', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
      }
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};
