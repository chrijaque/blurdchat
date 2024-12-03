import { Socket, io } from 'socket.io-client';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomId: string | null = null;
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
      this.socket.emit('register', {
        userId: this.userId,
        username: this.username
      });
    });

    this.socket.on('match', async (data: { roomId: string; users: { userId: string; username: string }[] }) => {
      this.roomId = data.roomId;
      await this.initializePeerConnection();
      this.onMatchFound(data.users);
    });

    this.socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      if (!this.peerConnection) {
        await this.initializePeerConnection();
      }
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection?.createAnswer();
      await this.peerConnection?.setLocalDescription(answer);
      this.socket.emit('answer', { answer, roomId: this.roomId });
    });

    this.socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    this.socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  private async initializePeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Opret dataChannel for den initierende peer
      if (!this.isFriendCall) {
        this.dataChannel = this.peerConnection.createDataChannel('chat');
        this.setupDataChannel(this.dataChannel);
      }

      // Lyt efter dataChannel fra den anden peer
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('ice-candidate', {
            candidate: event.candidate,
            roomId: this.roomId
          });
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        this.onConnectionStateChange(this.peerConnection!.connectionState);
      };

      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(this.remoteStream);
      };

      // Tilføj lokale streams
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localStream = stream;
      stream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, stream);
      });

      // Opret og send tilbud hvis ikke friend call
      if (!this.isFriendCall) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('offer', { offer, roomId: this.roomId });
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

  public requestUnblur() {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'unblurRequest'
      };
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  public acceptUnblur() {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'unblurAccept'
      };
      this.dataChannel.send(JSON.stringify(message));
      this.onUnblurAccepted();
    }
  }

  public disconnect() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.socket.disconnect();
  }

  public startSearching() {
    this.socket.emit('find-match', { userId: this.userId });
  }

  public async callFriend(friendId: string) {
    this.isFriendCall = true;
    this.socket.emit('call-friend', { 
      callerId: this.userId,
      callerName: this.username,
      friendId 
    });
  }

  public isConnected(): boolean {
    return !this.isFriendCall && this.roomId !== null;
  }
} 