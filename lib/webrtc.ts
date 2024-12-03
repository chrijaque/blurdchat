import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface MatchedUsers {
  [key: string]: {
    username: string;
  };
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomId: string | null = null;
  private matchedUsers: MatchedUsers | null = null;
  private isFriendCall: boolean = false;

  constructor(
    private userId: string,
    private username: string,
    private onRemoteStream: (stream: MediaStream) => void,
    private onConnectionStateChange: (state: RTCPeerConnectionState) => void,
    private onMatchFound: (users: { userId: string; username: string }[]) => void,
    private onUnblurRequested: () => void,
    private onUnblurAccepted: () => void,
    private onChatMessage: (message: { text: string; senderId: string; senderName: string; timestamp: number }) => void
  ) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    this.socket = io(socketUrl);
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('connect', () => {
      this.socket?.emit('register', {
        id: this.userId,
        username: this.username
      });
    });

    this.socket.on('match-found', ({ roomId, users, isFriendCall }) => {
      this.roomId = roomId;
      this.matchedUsers = users;
      this.isFriendCall = isFriendCall;
      this.onMatchFound(users);
    });

    this.socket.on('incoming-friend-call', ({ callerId, callerName }) => {
      this.onIncomingCall?.(callerId, callerName);
    });

    this.socket.on('friend-call-rejected', () => {
      this.onCallRejected?.();
    });

    this.socket.on('friend-call-failed', ({ reason }) => {
      this.onCallFailed?.(reason);
    });

    this.socket.on('friend-call-accepted', ({ roomId, users }) => {
      this.roomId = roomId;
      this.matchedUsers = users;
      this.isFriendCall = true;
      this.onMatchFound(users);
    });

    this.socket.on('chat-message', (message: ChatMessage) => {
      this.onChatMessage(message);
    });

    this.socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      await this.handleOffer(offer);
    });

    this.socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
      await this.handleAnswer(answer);
    });

    this.socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      await this.handleIceCandidate(candidate);
    });

    this.socket.on('unblur-requested', () => {
      if (!this.isFriendCall) {
        this.onUnblurRequested();
      }
    });

    this.socket.on('unblur-accepted', () => {
      if (!this.isFriendCall) {
        this.onUnblurAccepted();
      }
    });
  }

  public async callFriend(friendId: string) {
    this.socket?.emit('friend-call', {
      callerId: this.userId,
      callerName: this.username,
      friendId
    });
  }

  public acceptFriendCall(callerId: string) {
    this.socket?.emit('accept-friend-call', {
      callerId,
      friendId: this.userId
    });
  }

  public rejectFriendCall(callerId: string) {
    this.socket?.emit('reject-friend-call', {
      callerId,
      friendId: this.userId
    });
  }

  public async startCall(stream: MediaStream) {
    this.localStream = stream;
    await this.initializePeerConnection();
    
    if (this.peerConnection) {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket?.emit('offer', offer);
    }
  }

  private async initializePeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      if (!this.isFriendCall) {
        this.dataChannel = this.peerConnection.createDataChannel('chat');
        this.setupDataChannel(this.dataChannel);
      }

      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket?.emit('ice-candidate', event.candidate);
        }
      };

      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(event.streams[0]);
      };

      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection) {
          this.onConnectionStateChange(this.peerConnection.connectionState);
        }
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }
    } catch (error) {
      console.error('Fejl ved oprettelse af peer connection:', error);
      throw error;
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'chat') {
          this.onChatMessage(message.data);
        } else if (message.type === 'unblurRequest') {
          this.onUnblurRequested();
        } else if (message.type === 'unblurAccept') {
          this.onUnblurAccepted();
        }
      } catch (error) {
        console.error('Fejl ved behandling af besked:', error);
      }
    };

    channel.onopen = () => {
      console.log('DataChannel er åben');
    };

    channel.onclose = () => {
      console.log('DataChannel er lukket');
    };

    channel.onerror = (error) => {
      console.error('DataChannel fejl:', error);
    };
  }

  public async findMatch() {
    this.socket?.emit('find-match', this.userId);
  }

  public requestUnblur() {
    if (this.roomId && !this.isFriendCall) {
      this.socket?.emit('unblur-request', this.roomId);
    }
  }

  public acceptUnblur() {
    if (this.roomId && !this.isFriendCall) {
      this.socket?.emit('unblur-accept', this.roomId);
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.initializePeerConnection();
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket?.emit('answer', answer);
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(answer);
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(candidate);
    }
  }

  public disconnect() {
    this.peerConnection?.close();
    this.socket?.disconnect();
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.roomId = null;
    this.matchedUsers = null;
    this.isFriendCall = false;
  }

  public isVideoBlurred(): boolean {
    return !this.isFriendCall && this.roomId !== null;
  }

  public sendMessage(text: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'chat',
        data: {
          text,
          senderId: this.userId,
          senderName: this.username,
          timestamp: Date.now()
        }
      };
      this.dataChannel.send(JSON.stringify(message));
      // Trigger the callback for the sender's own message
      this.onChatMessage({
        text,
        senderId: this.userId,
        senderName: this.username,
        timestamp: Date.now()
      });
    }
  }
} 