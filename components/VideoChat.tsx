import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { WebRTCService } from '@/lib/webrtc';
import ChatBox from './ChatBox';
import Loading from './Loading';
import Toast from './Toast';

interface VideoChatProps {
  onDisconnect: () => void;
}

export default function VideoChat({ onDisconnect }: VideoChatProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBlurred, setIsBlurred] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webRTCRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    if (!user) return;

    const initializeWebRTC = async () => {
      try {
        webRTCRef.current = new WebRTCService(
          user.uid,
          user.displayName || 'Anonymous',
          handleRemoteStream,
          handleConnectionStateChange,
          handleMatchFound,
          handleUnblurRequest,
          handleUnblurAccept,
          handleChatMessage
        );

        await webRTCRef.current.startLocalStream();
        if (localVideoRef.current && webRTCRef.current) {
          localVideoRef.current.srcObject = webRTCRef.current.getLocalStream();
        }

        await webRTCRef.current.findMatch();
      } catch (error) {
        console.error('Error initializing WebRTC:', error);
        setError('Could not access camera or microphone');
        setIsLoading(false);
      }
    };

    initializeWebRTC();

    return () => {
      if (webRTCRef.current) {
        webRTCRef.current.disconnect();
      }
    };
  }, [user]);

  const handleRemoteStream = (stream: MediaStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      setIsLoading(false);
      setIsConnected(true);
    }
  };

  const handleConnectionStateChange = (state: RTCPeerConnectionState) => {
    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      setIsConnected(false);
      setToast({ message: 'Peer disconnected', type: 'info' });
      setTimeout(onDisconnect, 2000);
    }
  };

  const handleMatchFound = (roomId: string, users: any[]) => {
    if (webRTCRef.current) {
      webRTCRef.current.createOffer(roomId);
    }
  };

  const handleUnblurRequest = () => {
    setToast({ message: 'Peer requested to unblur', type: 'info' });
  };

  const handleUnblurAccept = () => {
    setIsBlurred(false);
    setToast({ message: 'Unblur accepted!', type: 'success' });
  };

  const handleChatMessage = (message: any) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = (message: string) => {
    if (webRTCRef.current) {
      webRTCRef.current.sendChatMessage(message);
    }
  };

  const handleRequestUnblur = () => {
    if (webRTCRef.current) {
      webRTCRef.current.requestUnblur();
      setToast({ message: 'Unblur request sent', type: 'info' });
    }
  };

  const handleAcceptUnblur = () => {
    if (webRTCRef.current) {
      webRTCRef.current.acceptUnblur();
      setIsBlurred(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button
            onClick={onDisconnect}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loading text="Connecting to peer..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full rounded-lg ${isBlurred ? 'filter blur-md' : ''}`}
            />
            <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              You
            </p>
          </div>
          
          <div className="relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full rounded-lg ${isBlurred ? 'filter blur-md' : ''}`}
            />
            <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              Peer
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-center space-x-4">
          <button
            onClick={handleRequestUnblur}
            disabled={!isBlurred}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Request Unblur
          </button>
          
          <button
            onClick={onDisconnect}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            End Chat
          </button>
        </div>

        <div className="mt-4">
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={user?.uid || ''}
          />
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
} 