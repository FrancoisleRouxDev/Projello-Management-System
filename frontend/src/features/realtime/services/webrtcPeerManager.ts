// frontend/src/features/realtime/services/webrtcPeerManager.ts
import { API_BASE_URL } from '../../../config';

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
  
  private iceServers: RTCIceServer[] = [];
  private configLoaded = false;

  constructor() {
    this.loadIceServers();
  }

  private async loadIceServers() {
    try {
      const token = localStorage.getItem('token') || '';
      const cleanToken = token.startsWith('"') && token.endsWith('"') 
        ? token.slice(1, -1) 
        : token;

      const response = await fetch(`${API_BASE_URL}/api/webrtc/config`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const config = await response.json();
      this.iceServers = config.iceServers || config.IceServers || [];

      if (this.iceServers.length === 0) throw new Error('No ICE servers received');

      console.log('✅ WebRTC ICE Servers loaded successfully from backend');
      this.configLoaded = true;

    } catch (error) {
      console.error('❌ Failed to load WebRTC config:', error);
      console.log('⚠️ Using hardcoded Metered TURN servers');
      this.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: ["turn:global.relay.metered.ca:80", "turn:global.relay.metered.ca:80?transport=tcp", "turn:global.relay.metered.ca:443", "turns:global.relay.metered.ca:443?transport=tcp"],
          username: "3e7b559d3b4bbc9012e16d54",
          credential: "7szZjkmvlFyDOuK7"
        }
      ];
      this.configLoaded = true;
    }
  }

  private getPeerConfig(): RTCConfiguration {
    return { iceServers: this.iceServers, iceCandidatePoolSize: 10 };
  }

  // ←←← THIS IS THE FIX: Early camera access + loud logging
  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      console.log('✅ Local stream already exists');
      return this.localStream;
    }

    console.log('📹 Requesting camera + microphone...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      this.localStream = stream;
      console.log('✅ CAMERA OPENED SUCCESSFULLY');
      return stream;
    } catch (error: any) {
      console.error('❌ CAMERA ACCESS FAILED:', error.name, error.message);
      throw error;
    }
  }

  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  async connectToPeer(peerId: string, isInitiator: boolean): Promise<void> {
    if (!this.configLoaded) await this.loadIceServers();

    console.log(`🔗 Creating peer connection for ${peerId} (initiator: ${isInitiator})`);

    if (this.peers.has(peerId)) {
      this.peers.get(peerId)!.close();
      this.peers.delete(peerId);
    }

    const pc = new RTCPeerConnection(this.getPeerConfig());
    this.peers.set(peerId, pc);

    const stream = await this.getLocalStream();   // ← This now runs every time
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) this.notify({ type: 'ice-candidate', candidate: event.candidate, peerId });
    };

    pc.ontrack = (event) => {
      console.log(`📹 REMOTE VIDEO RECEIVED from ${peerId}`);
      this.notify({ type: 'track', stream: event.streams[0], peerId });
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔄 Connection state for ${peerId} → ${pc.connectionState}`);
      this.notify({ type: 'connection-state-change', state: pc.connectionState, peerId });
    };

    if (isInitiator) {
      console.log(`📤 Creating offer for ${peerId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.notify({ type: 'offer', sdp: offer, peerId });
    }
  }

  // The rest stays exactly the same
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
    if (!pc) return;
    try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); } catch (e) { console.error('Error setting remote answer:', e); }
  }

  async handleRemoteIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (!pc) return;
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error('Error adding remote ICE candidate:', e); }
  }

  disconnectFromPeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) { pc.close(); this.peers.delete(peerId); }
  }

  notify(event: PeerConnectionEvent) {
    this.listeners.forEach(l => l(event));
  }

  on(callback: (event: PeerConnectionEvent) => void) {
    this.listeners.push(callback);
  }

  cleanup() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.stopLocalStream();
    this.listeners = [];
  }
}