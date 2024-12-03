import { useAuth } from '@/lib/AuthContext';
import LoginButton from '@/components/LoginButton';
import VideoChat from '@/components/VideoChat';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const [hasWebcamPermission, setHasWebcamPermission] = useState(false);
  const [isInChat, setIsInChat] = useState(false);

  useEffect(() => {
    if (user) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(() => setHasWebcamPermission(true))
        .catch(() => setHasWebcamPermission(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    );
  }

  if (isInChat) {
    return <VideoChat onDisconnect={() => setIsInChat(false)} />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Velkommen til Blurd.chat</h1>
      
      {!user ? (
        <div className="text-center">
          <p className="mb-4">Log ind for at starte en chat</p>
          <LoginButton />
        </div>
      ) : (
        <div className="text-center">
          {!hasWebcamPermission ? (
            <div>
              <p className="mb-4">Vi skal bruge adgang til dit kamera og mikrofon</p>
              <button 
                onClick={() => {
                  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .then(() => setHasWebcamPermission(true))
                    .catch(() => setHasWebcamPermission(false));
                }}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                Giv adgang
              </button>
            </div>
          ) : (
            <div>
              <button 
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
                onClick={() => setIsInChat(true)}
              >
                Start Blurd Chat
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
} 