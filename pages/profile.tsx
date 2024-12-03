import { useAuth } from '@/lib/AuthContext';
import UserProfile from '@/components/UserProfile';
import FriendsList from '@/components/FriendsList';
import { useRouter } from 'next/router';
import { WebRTCService } from '@/lib/webrtc';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Lyt efter indkommende opkald
    const webRTC = new WebRTCService(
      user.uid,
      user.displayName || 'Anonym',
      () => {}, // onRemoteStream
      () => {}, // onConnectionStateChange
      () => {}, // onMatchFound
      () => {}, // onUnblurRequested
      () => {}, // onUnblurAccepted
      () => {}  // onChatMessage
    );

    return () => {
      webRTC.disconnect();
    };
  }, [user]);

  const handleFriendCall = async (friendId: string) => {
    if (!user) return;

    try {
      const webRTC = new WebRTCService(
        user.uid,
        user.displayName || 'Anonym',
        () => {}, // onRemoteStream
        () => {}, // onConnectionStateChange
        () => {
          // Når forbindelsen er etableret, naviger til chat siden
          router.push('/chat');
        },
        () => {}, // onUnblurRequested
        () => {}, // onUnblurAccepted
        () => {}  // onChatMessage
      );

      // Start opkaldet
      await webRTC.callFriend(friendId);
    } catch (error) {
      console.error('Fejl ved opkald:', error);
      // TODO: Vis fejlbesked til brugeren
    }
  };

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
            <FriendsList
              userId={user.uid}
              onFriendCall={handleFriendCall}
            />
          </div>
        </div>
      </div>

      {/* Indkommende opkald modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Indkommende opkald</h3>
            <p className="mb-6">{incomingCall.callerName} ringer til dig</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  // TODO: Implementer afvisning af opkald
                  setIncomingCall(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Afvis
              </button>
              <button
                onClick={() => {
                  // TODO: Implementer accept af opkald
                  setIncomingCall(null);
                  router.push('/chat');
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Besvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 