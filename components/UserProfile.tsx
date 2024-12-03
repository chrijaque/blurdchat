import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { DatabaseService } from '@/lib/db';
import type { UserProfile as UserProfileType } from '@/types';

export default function UserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    gender: ''
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const userProfile = await DatabaseService.getUserProfile(user.uid);
    if (userProfile) {
      setProfile(userProfile);
      setFormData({
        username: userProfile.username,
        age: userProfile.age?.toString() || '',
        gender: userProfile.gender || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updates: Partial<UserProfileType> = {
      username: formData.username,
      updatedAt: Date.now()
    };

    if (formData.age) {
      updates.age = parseInt(formData.age);
    }

    if (formData.gender) {
      updates.gender = formData.gender as 'male' | 'female' | 'other';
    }

    await DatabaseService.updateUserProfile(user.uid, updates);
    await loadProfile();
    setIsEditing(false);
  };

  if (!profile) {
    return <div>Indlæser profil...</div>;
  }

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Rediger Profil</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Brugernavn
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alder
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Køn
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Vælg køn</option>
              <option value="male">Mand</option>
              <option value="female">Kvinde</option>
              <option value="other">Andet</option>
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Gem
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              Annuller
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Din Profil</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Rediger
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Brugernavn</h3>
          <p className="mt-1">{profile.username}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Alder</h3>
          <p className="mt-1">{profile.age || 'Ikke angivet'}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Køn</h3>
          <p className="mt-1">
            {profile.gender === 'male' ? 'Mand' :
             profile.gender === 'female' ? 'Kvinde' :
             profile.gender === 'other' ? 'Andet' :
             'Ikke angivet'}
          </p>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium text-gray-500">Statistik</h3>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{profile.coins}</p>
              <p className="text-sm text-gray-500">Mønter</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{profile.totalChats}</p>
              <p className="text-sm text-gray-500">Chats</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{profile.totalUnblurs}</p>
              <p className="text-sm text-gray-500">Unblurs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 