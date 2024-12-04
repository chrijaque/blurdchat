import { useEffect, useState } from 'react';
import { DatabaseService } from '@/lib/db';
import type { Friend } from '@/types';

interface FriendsListProps {
  userId: string;
}

export default function FriendsList({ userId }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFriends();
  }, [userId]);

  const loadFriends = async () => {
    try {
      const friendsList = await DatabaseService.getFriends(userId);
      setFriends(friendsList);
    } catch (error) {
      console.error('Fejl ved indlæsning af venner:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4">
        <p>Indlæser venner...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">Dine Venner</h2>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Søg efter venner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {friends.length === 0 ? (
        <p className="text-gray-500 text-center">
          Du har ikke tilføjet nogen venner endnu.
          <br />
          Fjern blur i en chat for at tilføje en ven!
        </p>
      ) : (
        <div className="space-y-2">
          {filteredFriends.map((friend) => (
            <div
              key={friend.uid}
              className="p-3 rounded-lg border hover:bg-blue-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{friend.username}</h3>
                  <p className="text-sm text-gray-500">
                    Tilføjet {new Date(friend.addedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 