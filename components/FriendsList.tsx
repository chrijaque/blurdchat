import { useEffect, useState } from 'react';
import { DatabaseService } from '@/lib/db';
import { useAuth } from '@/lib/AuthContext';
import type { Friend } from '@/types';

interface FriendsListProps {
  userId: string;
  onFriendCall?: (friendId: string) => void;
}

export default function FriendsList({ userId, onFriendCall }: FriendsListProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [callingFriendId, setCallingFriendId] = useState<string | null>(null);

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

  const handleCallFriend = (friendId: string) => {
    setCallingFriendId(friendId);
    onFriendCall?.(friendId);
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
                <button
                  onClick={() => handleCallFriend(friend.uid)}
                  disabled={callingFriendId === friend.uid}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {callingFriendId === friend.uid ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Ringer...
                    </span>
                  ) : (
                    'Ring op'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 