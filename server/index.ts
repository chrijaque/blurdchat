import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

interface User {
  id: string;
  age?: number;
  gender?: string;
  socketId: string;
  isAvailable: boolean;
  username?: string;
}

interface ChatMessage {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

const users = new Map<string, User>();
const waitingUsers = new Set<string>();
const chatHistory = new Map<string, ChatMessage[]>();
const friendCalls = new Map<string, { callerId: string, callerName: string }>();

io.on('connection', (socket) => {
  console.log('Bruger forbundet:', socket.id);

  socket.on('register', (userData: { id: string; age?: number; gender?: string; username?: string }) => {
    users.set(userData.id, {
      ...userData,
      socketId: socket.id,
      isAvailable: true
    });
  });

  // Venneopkald håndtering
  socket.on('friend-call', async ({ callerId, callerName, friendId }) => {
    const friend = users.get(friendId);
    if (friend && friend.isAvailable) {
      friendCalls.set(friendId, { callerId, callerName });
      io.to(friend.socketId).emit('incoming-friend-call', {
        callerId,
        callerName
      });
    } else {
      // Vennen er ikke tilgængelig
      socket.emit('friend-call-failed', {
        friendId,
        reason: 'unavailable'
      });
    }
  });

  socket.on('accept-friend-call', ({ callerId, friendId }) => {
    const caller = users.get(callerId);
    const friend = users.get(friendId);
    
    if (caller && friend) {
      // Opret et chat rum for vennerne
      const roomId = `friend-${callerId}-${friendId}`;
      socket.join(roomId);
      io.sockets.sockets.get(caller.socketId)?.join(roomId);

      // Marker begge brugere som ikke tilgængelige
      users.get(callerId)!.isAvailable = false;
      users.get(friendId)!.isAvailable = false;

      // Fjern ventende opkald
      friendCalls.delete(friendId);

      // Informer begge brugere om det accepterede opkald
      io.to(roomId).emit('friend-call-accepted', {
        roomId,
        isFriendCall: true,
        users: {
          [callerId]: { username: caller.username },
          [friendId]: { username: friend.username }
        }
      });
    }
  });

  socket.on('reject-friend-call', ({ callerId, friendId }) => {
    const caller = users.get(callerId);
    if (caller) {
      io.to(caller.socketId).emit('friend-call-rejected', { friendId });
    }
    friendCalls.delete(friendId);
  });

  socket.on('find-match', async (userId: string) => {
    const user = users.get(userId);
    if (!user) return;

    waitingUsers.add(userId);
    
    // Find en match baseret på alder og køn
    const potentialMatches = Array.from(waitingUsers)
      .filter(id => id !== userId)
      .map(id => users.get(id))
      .filter(u => u && u.isAvailable)
      .sort((a, b) => {
        if (!a || !b || !user.age) return 0;
        const ageDiffA = Math.abs((a.age || 0) - (user.age || 0));
        const ageDiffB = Math.abs((b.age || 0) - (user.age || 0));
        return ageDiffA - ageDiffB;
      });

    const match = potentialMatches[0];
    if (match) {
      waitingUsers.delete(userId);
      waitingUsers.delete(match.id);
      
      users.get(userId)!.isAvailable = false;
      users.get(match.id)!.isAvailable = false;

      // Opret et chat rum for de matchede brugere
      const roomId = `${userId}-${match.id}`;
      socket.join(roomId);
      io.sockets.sockets.get(match.socketId)?.join(roomId);

      // Initialiser chat historik for rummet
      chatHistory.set(roomId, []);

      // Informer begge brugere om matchet
      io.to(roomId).emit('match-found', { 
        roomId,
        isFriendCall: false,
        users: {
          [userId]: { username: user.username },
          [match.id]: { username: match.username }
        }
      });
    }
  });

  // WebRTC Signalering
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  // Unblur håndtering
  socket.on('unblur-request', (roomId) => {
    socket.to(roomId).emit('unblur-requested');
  });

  socket.on('unblur-accept', (roomId) => {
    io.to(roomId).emit('unblur-accepted');
  });

  socket.on('disconnect', () => {
    // Find og fjern brugeren fra alle collections
    const userId = Array.from(users.entries())
      .find(([_, user]) => user.socketId === socket.id)?.[0];
    
    if (userId) {
      // Afbryd eventuelle ventende opkald
      if (friendCalls.has(userId)) {
        const { callerId } = friendCalls.get(userId)!;
        const caller = users.get(callerId);
        if (caller) {
          io.to(caller.socketId).emit('friend-call-failed', {
            friendId: userId,
            reason: 'disconnected'
          });
        }
        friendCalls.delete(userId);
      }

      users.delete(userId);
      waitingUsers.delete(userId);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server kører på port ${PORT}`);
}); 