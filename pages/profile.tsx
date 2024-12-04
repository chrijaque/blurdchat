import { useAuth } from '@/lib/AuthContext';
import UserProfile from '@/components/UserProfile';
import FriendsList from '@/components/FriendsList';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Din Profil</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <UserProfile />
          </div>
          
          <div>
            <FriendsList userId={user.uid} />
          </div>
        </div>
      </div>
    </div>
  );
} 