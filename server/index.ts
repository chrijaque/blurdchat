import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { AddressInfo } from 'net';
import { writeFile } from 'fs/promises';

const app = express();
const httpServer = createServer(app);

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://blurd.chat',
  'https://www.blurd.chat'
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Active users and rooms
const activeUsers = new Map<string, { userId: string; username: string; socketId: string }>();
const activeRooms = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', ({ userId, username }) => {
    activeUsers.set(socket.id, { userId, username, socketId: socket.id });
    console.log('User registered:', { userId, username });
  });

  socket.on('find-match', ({ userId }) => {
    const user = Array.from(activeUsers.values()).find(u => u.userId === userId);
    if (!user) return;

    // Find another user who is not in a room
    const availableUser = Array.from(activeUsers.values()).find(u => 
      u.userId !== userId && 
      !Array.from(activeRooms.values()).some(room => room.has(u.socketId))
    );

    if (availableUser) {
      const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const room = new Set([socket.id, availableUser.socketId]);
      activeRooms.set(roomId, room);

      // Join socket.io room
      socket.join(roomId);
      const availableSocket = io.sockets.sockets.get(availableUser.socketId);
      if (availableSocket) {
        availableSocket.join(roomId);
      }

      // Notify both users
      const users = [
        { userId: user.userId, username: user.username },
        { userId: availableUser.userId, username: availableUser.username }
      ];

      io.to(roomId).emit('match', { roomId, users });
    }
  });

  socket.on('offer', ({ offer, roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const recipientSocket = Array.from(room).find(id => id !== socket.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('offer', offer);
      }
    }
  });

  socket.on('answer', ({ answer, roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const recipientSocket = Array.from(room).find(id => id !== socket.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('answer', answer);
      }
    }
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const recipientSocket = Array.from(room).find(id => id !== socket.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('ice-candidate', candidate);
      }
    }
  });

  socket.on('unblur-request', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const recipientSocket = Array.from(room).find(id => id !== socket.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('unblur-request');
      }
    }
  });

  socket.on('unblur-accept', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const recipientSocket = Array.from(room).find(id => id !== socket.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('unblur-accept');
      }
    }
  });

  socket.on('chat-message', ({ roomId, message, senderId, senderName }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      io.to(roomId).emit('chat-message', { message, senderId, senderName });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up user from active users
    activeUsers.delete(socket.id);

    // Clean up rooms and notify peers
    activeRooms.forEach((room, roomId) => {
      if (room.has(socket.id)) {
        const otherUser = Array.from(room).find(id => id !== socket.id);
        if (otherUser) {
          io.to(otherUser).emit('peer-disconnected');
        }
        activeRooms.delete(roomId);
      }
    });
  });
});

// Start server on port 3002
const PORT = 3002;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 