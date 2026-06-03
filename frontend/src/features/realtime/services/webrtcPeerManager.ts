import { API_BASE_URL } from '../../../config';

export type PeerConnectionEvent =
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; peerId: string }
  | { type: 'track'; stream: MediaStream; peerId: string }
  | { type: 'connection-state-change'; state: string; peerId: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit; peerId: string }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit; peerId: string };

// === SINGLETON INSTANCE ===
let peerManagerInstance: WebRTCPeerManager | null = null;

export class WebRTCPeerManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private listeners: ((event: PeerConnectionEvent) => void)[] = [];

  // === Camera state (from v2) ===
  private cameraEnabled = true;
  private currentVideoDeviceId: string | null = null;

  private iceServers: RTCIceServer[] = [];
  private configLoaded = false;

  private constructor() {
    this.loadIceServers();
  }

  public static getInstance(): WebRTCPeerManager {
    if (!peerManagerInstance) {
      peerManagerInstance = new WebRTCPeerManager();
    }
    return peerManagerInstance;
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

      console.log('WebRTC ICE Servers loaded successfully from backend');
      this.configLoaded = true;
    } catch (error) {
      console.error('Failed to load WebRTC config:', error);
      // Fallback (dev only)
      this.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: [
            "turn:global.relay.metered.ca:80",
            "turn:global.relay.metered.ca:80?transport=tcp",
            "turn:global.relay.metered.ca:443",
            "turns:global.relay.metered.ca:443?transport=tcp"
          ],
          username: "3e7b559d3b4bbc9012e16d54",
          credential: "7szZjkmvlFyDOuK7"
        }
      ];
      this.configLoaded = true;
    }
  }

  private getPeerConfig(): RTCConfiguration {
    return {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: "all"
    };
  }

  // ==================== CAMERA / LOCAL STREAM ====================

  async getLocalStream(videoDeviceId?: string | null): Promise<MediaStream> {
    if (this.localStream) {
      console.log('Local stream already exists');
      return this.localStream;
    }

    console.log('Requesting camera + microphone...');
    try {
      const videoConstraints = this.cameraEnabled
        ? this.getVideoConstraints(videoDeviceId ?? this.currentVideoDeviceId)
        : false;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });

      this.localStream = stream;
      this.cameraEnabled = stream.getVideoTracks().length > 0;
      this.currentVideoDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? videoDeviceId ?? null;

      console.log('CAMERA OPENED SUCCESSFULLY');
      return stream;
    } catch (error: any) {
      console.error('CAMERA ACCESS FAILED:', error.name, error.message);
      throw error;
    }
  }

  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

  isCameraEnabled(): boolean {
    return this.cameraEnabled;
  }

  getCurrentVideoDeviceId(): string | null {
    return this.currentVideoDeviceId;
  }

  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput');
  }

  private getVideoConstraints(deviceId?: string | null): MediaTrackConstraints {
    if (deviceId) {
      return {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
    }
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }

  private async replaceVideoTrack(nextTrack: MediaStreamTrack | null) {
    if (!this.localStream) return;

    const existingVideoTracks = this.localStream.getVideoTracks();
    const previousTrack = existingVideoTracks[0];

    if (previousTrack && previousTrack !== nextTrack) {
      previousTrack.stop();
      this.localStream.removeTrack(previousTrack);
    }

    if (nextTrack && !this.localStream.getVideoTracks().includes(nextTrack)) {
      this.localStream.addTrack(nextTrack);
    }

    // Update all existing peer connections
    for (const pc of this.peers.values()) {
      const sender = pc.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(nextTrack);
      }
    }
  }

  /**
   * Turn camera on/off during an active call.
   * This is what your "close/open camera" button should call.
   */
  async setCameraEnabled(enabled: boolean, deviceId?: string | null): Promise<MediaStream> {
    if (!enabled) {
      this.cameraEnabled = false;
      this.currentVideoDeviceId = null;
      await this.replaceVideoTrack(null);
      return this.localStream ?? new MediaStream();
    }

    this.cameraEnabled = true;

    if (!this.localStream) {
      await this.getLocalStream(deviceId ?? this.currentVideoDeviceId);
      return this.localStream ?? new MediaStream();
    }

    // Get fresh video track (common pattern — can't reliably "un-stop" a track)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: this.getVideoConstraints(deviceId ?? this.currentVideoDeviceId),
      audio: false,
    });

    const nextTrack = stream.getVideoTracks()[0];
    if (!nextTrack) {
      throw new Error('No camera track available');
    }

    await this.replaceVideoTrack(nextTrack);
    this.currentVideoDeviceId = nextTrack.getSettings().deviceId ?? deviceId ?? this.currentVideoDeviceId;

    return this.localStream;
  }

  async switchCamera(deviceId: string): Promise<MediaStream> {
    return this.setCameraEnabled(true, deviceId);
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      this.cameraEnabled = true;
      this.currentVideoDeviceId = null;
    }
  }

  // ==================== PEER CONNECTION ====================

  private async ensurePeerConnection(peerId: string): Promise<RTCPeerConnection> {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    if (!this.localStream) {
      await this.getLocalStream();
    }

    console.log(`Creating peer connection for ${peerId}`);
    const pc = new RTCPeerConnection(this.getPeerConfig());
    this.peers.set(peerId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.notify({ type: 'ice-candidate', candidate: event.candidate, peerId });
      }
    };

    pc.ontrack = (event) => {
      console.log(`REMOTE VIDEO RECEIVED from ${peerId}`);
      this.notify({ type: 'track', stream: event.streams[0], peerId });
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId} → ${pc.connectionState}`);
      this.notify({ type: 'connection-state-change', state: pc.connectionState, peerId });
    };

    return pc;
  }

  async connectToPeer(peerId: string, isInitiator: boolean): Promise<void> {
    if (!this.configLoaded) await this.loadIceServers();

    const pc = await this.ensurePeerConnection(peerId);

    if (isInitiator) {
      console.log(`Creating offer for ${peerId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[DEBUG] About to notify 'offer' event for:", peerId);
      this.notify({ type: 'offer', sdp: offer, peerId });
    }
  }

  async acceptOffer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = await this.ensurePeerConnection(peerId);

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
    const pc = await this.ensurePeerConnection(peerId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
      console.error('Error setting remote answer:', e);
    }
  }

  async handleRemoteIceCandidate(peerId: string, candidateInit: RTCIceCandidateInit): Promise<void> {
    const pc = await this.ensurePeerConnection(peerId);
    try {
      if (candidateInit.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      }
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
    console.log("[DEBUG] notify() called with type:", event.type);
    this.listeners.forEach(l => l(event));
  }

  on(callback: (event: PeerConnectionEvent) => void) {
    this.listeners.push(callback);
  }

  cleanup() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.stopLocalStream();
    // Do NOT clear listeners — prevents breaking the service listener in useProjectCall
  }
}