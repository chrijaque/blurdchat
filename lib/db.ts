import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, Friend, ChatSession, Report } from '@/types';

export class DatabaseService {
  // User Profile Operations
  static async createUserProfile(uid: string, username: string): Promise<void> {
    const userProfile: UserProfile = {
      uid,
      username,
      coins: 0,
      totalChats: 0,
      totalUnblurs: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'users', uid), userProfile);
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as UserProfile : null;
  }

  static async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Date.now()
    });
  }

  // Friends Operations
  static async addFriend(userId: string, friendId: string, friendUsername: string): Promise<void> {
    const friend: Friend = {
      uid: friendId,
      username: friendUsername,
      addedAt: Date.now()
    };

    await setDoc(
      doc(db, 'users', userId, 'friends', friendId),
      friend
    );
  }

  static async getFriends(userId: string): Promise<Friend[]> {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(friendsRef, orderBy('addedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as Friend);
  }

  // Chat Session Operations
  static async createChatSession(participants: string[]): Promise<string> {
    const session: Omit<ChatSession, 'id'> = {
      participants,
      startedAt: Date.now(),
      coinsEarned: 0
    };

    const docRef = await addDoc(collection(db, 'chatSessions'), session);
    return docRef.id;
  }

  static async updateChatSession(sessionId: string, data: Partial<ChatSession>): Promise<void> {
    const docRef = doc(db, 'chatSessions', sessionId);
    await updateDoc(docRef, data);
  }

  static async addCoinsToSession(sessionId: string, coins: number): Promise<void> {
    const docRef = doc(db, 'chatSessions', sessionId);
    await updateDoc(docRef, {
      coinsEarned: increment(coins)
    });
  }

  // Report Operations
  static async createReport(report: Omit<Report, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const fullReport: Omit<Report, 'id'> = {
      ...report,
      status: 'pending',
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, 'reports'), fullReport);
    return docRef.id;
  }

  static async getReports(): Promise<Report[]> {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
  }

  static async updateReportStatus(reportId: string, status: Report['status']): Promise<void> {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, { status });
  }

  static async getReportsByUser(userId: string): Promise<Report[]> {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef,
      where('reportedId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
  }

  // Coin Operations
  static async addCoinsToUser(userId: string, coins: number): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      coins: increment(coins),
      updatedAt: Date.now()
    });
  }

  static async getUserStats(userId: string): Promise<{
    coins: number;
    totalChats: number;
    totalUnblurs: number;
  } | null> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return null;

    return {
      coins: profile.coins,
      totalChats: profile.totalChats,
      totalUnblurs: profile.totalUnblurs
    };
  }
} 