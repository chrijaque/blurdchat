import { io, Socket } from 'socket.io-client';

export class WebRTCService {
  private socket: Socket;
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private currentRoomId: string | null = null;

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
    this.socket = io('http://localhost:3002', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Initialize WebRTC peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.setupSocketEvents();
    this.setupPeerConnectionListeners();
  }

  private setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.registerUser();
    });

    this.socket.on('match', ({ roomId, users }) => {
      console.log('Match found:', { roomId, users });
      this.currentRoomId = roomId;
      this.onMatchFound(roomId, users);
    });

    this.socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      try {
        console.log('Received offer');
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
        console.log('Received answer');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    this.socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      try {
        console.log('Received ICE candidate');
        if (this.peerConnection.remoteDescription) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    this.socket.on('unblur-request', () => {
      console.log('Received unblur request');
      this.onUnblurRequested();
    });

    this.socket.on('unblur-accept', () => {
      console.log('Unblur accepted');
      this.onUnblurAccepted();
    });

    this.socket.on('chat-message', (message) => {
      console.log('Received chat message');
      this.onChatMessage(message);
    });

    this.socket.on('peer-disconnected', () => {
      console.log('Peer disconnected');
      this.onConnectionStateChange('disconnected');
    });
  }

  private setupPeerConnectionListeners() {
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track');
      this.onRemoteStream(event.streams[0]);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        console.log('Sending ICE candidate');
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          roomId: this.currentRoomId
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      this.onConnectionStateChange(this.peerConnection.connectionState);
    };
  }

  private registerUser() {
    console.log('Registering user:', { userId: this.userId, username: this.username });
    this.socket.emit('register', { userId: this.userId, username: this.username });
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

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

  public findMatch(): void {
    console.log('Finding match');
    this.socket.emit('find-match', { userId: this.userId });
  }

  public async createOffer(roomId: string): Promise<void> {
    try {
      console.log('Creating offer');
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
      console.log('Requesting unblur');
      this.socket.emit('unblur-request', { roomId: this.currentRoomId });
    }
  }

  public acceptUnblur(): void {
    if (this.currentRoomId) {
      console.log('Accepting unblur');
      this.socket.emit('unblur-accept', { roomId: this.currentRoomId });
    }
  }

  public sendChatMessage(message: string): void {
    if (this.currentRoomId) {
      console.log('Sending chat message');
      this.socket.emit('chat-message', {
        roomId: this.currentRoomId,
        message,
        senderId: this.userId,
        senderName: this.username
      });
    }
  }

  public disconnect(): void {
    console.log('Disconnecting');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.peerConnection.close();
    this.socket.disconnect();
  }
} 