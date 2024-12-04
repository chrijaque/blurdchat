import { useAuth } from '@/lib/AuthContext';
import UserProfile from '@/components/UserProfile';
import FriendsList from '@/components/FriendsList';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      console.log('No user found, redirecting to home');
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <Loading text="Indlæser profil..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl mb-4">Der opstod en fejl</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
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