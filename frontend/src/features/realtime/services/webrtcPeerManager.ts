// frontend/src/features/realtime/services/webrtcPeerManager.ts
export type PeerConnectionEvent = 
| { type: 'ice-candidate'; candidate: RTCIceCandidateInit; peerId: string }
| { type: 'track'; stream: MediaStream; peerId: string }
| { type: 'connection-state-change'; state: string; peerId: string }
| { type: 'offer'; sdp: RTCSessionDescriptionInit; peerId: string }
| { type: 'answer'; sdp: RTCSessionDescriptionInit; peerId: string };

export class WebRTCPeerManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private listeners: ((event: PeerConnectionEvent) => void)[] = [];

  constructor() {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers here if external users need to connect to your Electron app
      ],
      iceCandidatePoolSize: 10, 
    };

    if (typeof RTCPeerConnection === 'undefined') {
      console.warn('WebRTC not supported in this environment.');
    }
  }

  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  async connectToPeer(peerId: string, isInitiator: boolean): Promise<void> {
    if (this.peers.has(peerId)) {
      const existing = this.peers.get(peerId)!;
      existing.close();
      this.peers.delete(peerId);
    }

    const pc = new RTCPeerConnection();
    this.peers.set(peerId, pc);
    
    const stream = await this.getLocalStream();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.notify({ type: 'ice-candidate', candidate: event.candidate, peerId });
      }
    };

    pc.ontrack = (event) => {
      this.notify({ type: 'track', stream: event.streams[0], peerId });
    };

    pc.onconnectionstatechange = () => {
      this.notify({ type: 'connection-state-change', state: pc.connectionState, peerId });
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.notify({ type: 'offer', sdp: offer, peerId });
    }
  }

  async acceptOffer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peers.get(peerId);
    if (!pc) return null;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.notify({ type: 'answer', sdp: answer, peerId });
      return answer;
    } catch (e) {
      console.error('Error creating answer:', e);
      return null;
    }
  }

  async setRemoteAnswer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (!pc) {
      console.warn(`No peer connection found for ID: ${peerId}. Cannot set remote answer.`);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
      console.error('Error setting remote answer:', e);
      throw e;
    }
  }

  async handleRemoteIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (!pc) return;
    
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding remote ICE candidate:', e);
    }
  }

  disconnectFromPeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
  }

  notify(event: PeerConnectionEvent) {
    this.listeners.forEach((l) => l(event));
  }

  on(callback: (event: PeerConnectionEvent) => void) {
    this.listeners.push(callback);
  }

  cleanup() {
    this.peers.forEach((pc) => {
      pc.close();
    });
    this.peers.clear();
    this.stopLocalStream();
    this.listeners = [];
  }
}