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
  private socket: Socket | null = null;
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
    private onMatchFound: (users: MatchedUsers) => void,
    private onUnblurRequested: () => void,
    private onUnblurAccepted: () => void,
    private onChatMessage: (message: ChatMessage) => void,
    private onIncomingCall?: (callerId: string, callerName: string) => void,
    private onCallRejected?: () => void,
    private onCallFailed?: (reason: string) => void
  ) {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io('http://207.154.254.52:3001');

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
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

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
} 