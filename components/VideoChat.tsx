import { useEffect, useRef, useState } from 'react';
import { WebRTCService } from '@/lib/webrtc';
import { useAuth } from '@/lib/AuthContext';
import { CoinService } from '@/lib/CoinService';
import { DatabaseService } from '@/lib/db';
import ChatBox from './ChatBox';
import ReportModal from './ReportModal';

interface ChatMessage {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface VideoChatProps {
  onDisconnect: () => void;
  friendId?: string;
  isFriendCall?: boolean;
}

export default function VideoChat({ onDisconnect, friendId, isFriendCall }: VideoChatProps) {
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webRTCRef = useRef<WebRTCService | null>(null);
  const coinServiceRef = useRef<CoinService | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isBlurred, setIsBlurred] = useState(!isFriendCall);
  const [isSearching, setIsSearching] = useState(true);
  const [hasMatch, setHasMatch] = useState(false);
  const [unblurRequested, setUnblurRequested] = useState(false);
  const [waitingForUnblurAccept, setWaitingForUnblurAccept] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [matchedUsers, setMatchedUsers] = useState<{[key: string]: { username: string }}>({});
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [friendAdded, setFriendAdded] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportedUserId, setReportedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const startVideoChat = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Opret chat session
        const newSessionId = await DatabaseService.createChatSession([user.uid]);
        setSessionId(newSessionId);

        // Initialiser coin service (kun for ikke-venneopkald)
        if (!isFriendCall) {
          coinServiceRef.current = new CoinService(user.uid, newSessionId);
        }

        webRTCRef.current = new WebRTCService(
          user.uid,
          user.displayName || 'Anonym',
          (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          },
          setConnectionState,
          async (users) => {
            setIsSearching(false);
            setHasMatch(true);
            setMatchedUsers(users);

            if (!isFriendCall) {
              // Start coin tracking kun for ikke-venneopkald
              coinServiceRef.current?.startTracking();

              // Opdater session med begge deltagere
              if (sessionId) {
                const otherUserId = Object.keys(users).find(id => id !== user.uid);
                if (otherUserId) {
                  await DatabaseService.updateChatSession(sessionId, {
                    participants: [user.uid, otherUserId]
                  });
                }
              }
            }
          },
          () => setUnblurRequested(true),
          async () => {
            setIsBlurred(false);
            setUnblurRequested(false);
            setWaitingForUnblurAccept(false);
            
            if (!isFriendCall) {
              // Håndter unblur og coins kun for ikke-venneopkald
              await coinServiceRef.current?.handleUnblur();
              setCoinsEarned(coinServiceRef.current?.getTotalCoinsEarned() || 0);

              // Tilføj brugerne som venner
              if (!friendAdded) {
                const otherUserId = Object.keys(matchedUsers).find(id => id !== user.uid);
                if (otherUserId && matchedUsers[otherUserId]) {
                  await Promise.all([
                    DatabaseService.addFriend(
                      user.uid,
                      otherUserId,
                      matchedUsers[otherUserId].username
                    ),
                    DatabaseService.addFriend(
                      otherUserId,
                      user.uid,
                      user.displayName || 'Anonym'
                    )
                  ]);
                  setFriendAdded(true);
                }
              }
            }
          },
          (message) => {
            setMessages(prev => [...prev, message]);
          }
        );

        await webRTCRef.current.startCall(stream);
        
        if (friendId) {
          // Hvis det er et venneopkald, ring til vennen
          await webRTCRef.current.callFriend(friendId);
        } else {
          // Ellers find en tilfældig match
          await webRTCRef.current.findMatch();
        }
      } catch (error) {
        console.error('Fejl ved start af video chat:', error);
        onDisconnect();
      }
    };

    startVideoChat();

    return () => {
      webRTCRef.current?.disconnect();
      if (!isFriendCall) {
        coinServiceRef.current?.endSession().then(() => {
          setCoinsEarned(coinServiceRef.current?.getTotalCoinsEarned() || 0);
        });
      }
    };
  }, [user, onDisconnect, friendId, isFriendCall]);

  const handleUnblur = () => {
    if (!webRTCRef.current) return;
    
    if (unblurRequested) {
      webRTCRef.current.acceptUnblur();
      setIsBlurred(false);
      setUnblurRequested(false);
    } else {
      webRTCRef.current.requestUnblur();
      setWaitingForUnblurAccept(true);
    }
  };

  const handleSendMessage = (message: string) => {
    webRTCRef.current?.sendMessage(message);
  };

  const handleDisconnect = async () => {
    if (!isFriendCall) {
      await coinServiceRef.current?.endSession();
      setCoinsEarned(coinServiceRef.current?.getTotalCoinsEarned() || 0);
    }
    onDisconnect();
  };

  const handleReport = () => {
    const otherUserId = Object.keys(matchedUsers).find(id => id !== user?.uid);
    if (otherUserId) {
      setReportedUserId(otherUserId);
      setIsReportModalOpen(true);
    }
  };

  if (isSearching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">
          {friendId ? 'Ringer op...' : 'Søger efter en chat partner...'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Du
              </div>
            </div>
            
            <div className="relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full rounded-lg ${isBlurred ? 'blur-lg' : ''}`}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                {isBlurred ? 'Partner' : matchedUsers[Object.keys(matchedUsers).find(id => id !== user?.uid) || '']?.username || 'Partner'}
              </div>
              {!isBlurred && friendAdded && !isFriendCall && (
                <div className="absolute top-2 right-2 bg-green-500 bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                  Tilføjet som ven ✓
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-4">
              {hasMatch && !isFriendCall && (
                <button
                  onClick={handleUnblur}
                  disabled={!isBlurred || waitingForUnblurAccept}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {unblurRequested ? 'Accepter Unblur' : waitingForUnblurAccept ? 'Venter på svar...' : 'Anmod om Unblur'}
                </button>
              )}
              
              <button
                onClick={handleDisconnect}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Afslut Chat
              </button>

              {!isFriendCall && (
                <button
                  onClick={handleReport}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
                >
                  Rapporter
                </button>
              )}
            </div>

            {!isFriendCall && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Optjente mønter denne session:</p>
                <p className="text-xl font-bold">{coinsEarned} 🪙</p>
              </div>
            )}
          </div>

          <div className="text-center mt-4">
            <p>Status: {connectionState}</p>
            {unblurRequested && !isFriendCall && (
              <p className="text-blue-500 mt-2">
                Din partner vil gerne fjerne blur effekten. Klik på "Accepter Unblur" for at acceptere.
              </p>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={user?.uid || ''}
          />
        </div>
      </div>

      {reportedUserId && sessionId && user && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportedUserId(null);
          }}
          reporterId={user.uid}
          reportedId={reportedUserId}
          sessionId={sessionId}
        />
      )}
    </div>
  );
} 