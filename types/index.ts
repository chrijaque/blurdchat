export interface UserProfile {
  uid: string;
  username: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  coins: number;
  totalChats: number;
  totalUnblurs: number;
  createdAt: number;
  updatedAt: number;
}

export interface Friend {
  uid: string;
  username: string;
  addedAt: number;
  lastChatAt?: number;
}

export interface ChatSession {
  id: string;
  participants: string[];
  startedAt: number;
  endedAt?: number;
  unblurredAt?: number;
  coinsEarned: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  description: string;
  sessionId: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'resolved';
} 