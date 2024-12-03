import { io, Socket } from 'socket.io-client';

export class WebRTCService {
  private socket: Socket;
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;

  constructor(
    private userId: string,
    private username: string,
    private onRemoteStream: (stream: MediaStream) => void,
    private onConnectionStateChange: (state: RTCPeerConnectionState) => void,
    private onMatchFound: (roomId: string, users: any[]) => void,
    private onUnblurRequested: () => void,
    private onUnblurAccepted: () => void,
    private onChatMessage: (message: any) => void
  ) {
    // Initialize socket connection
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'https://blurd.chat', {
      transports: ['websocket'],
      autoConnect: true
    });

    // Initialize WebRTC peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });

    this.setupSocketListeners();
    this.setupPeerConnectionListeners();
    this.registerUser();
  }

  private registerUser() {
    this.socket.emit('register', { userId: this.userId, username: this.username });
  }

  private setupSocketListeners() {
    this.socket.on('match', ({ roomId, users }) => {
      console.log('Match found:', { roomId, users });
      this.onMatchFound(roomId, users);
    });

    this.socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.socket.emit('answer', { answer, roomId: this.currentRoomId });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    this.socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    this.socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ice candidate:', error);
      }
    });

    this.socket.on('peer-disconnected', () => {
      this.onConnectionStateChange('disconnected');
      this.disconnect();
    });
  }

  private setupPeerConnectionListeners() {
    this.peerConnection.ontrack = (event) => {
      this.onRemoteStream(event.streams[0]);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          roomId: this.currentRoomId
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.onConnectionStateChange(this.peerConnection.connectionState);
    };
  }

  private currentRoomId: string | null = null;

  public async startLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  public async findMatch(): Promise<void> {
    this.socket.emit('find-match', { userId: this.userId });
  }

  public async createOffer(roomId: string): Promise<void> {
    try {
      this.currentRoomId = roomId;
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('offer', { offer, roomId });
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  public requestUnblur(): void {
    if (this.currentRoomId) {
      this.socket.emit('unblur-request', this.currentRoomId);
    }
  }

  public acceptUnblur(): void {
    if (this.currentRoomId) {
      this.socket.emit('unblur-accept', this.currentRoomId);
    }
  }

  public sendChatMessage(message: string): void {
    if (this.currentRoomId) {
      this.socket.emit('chat-message', {
        roomId: this.currentRoomId,
        message,
        senderId: this.userId,
        senderName: this.username
      });
    }
  }

  public async callFriend(friendId: string): Promise<void> {
    this.socket.emit('call-friend', {
      callerId: this.userId,
      callerName: this.username,
      friendId
    });
  }

  public disconnect(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.peerConnection.close();
    this.socket.disconnect();
  }
} 