import { createSignalRClient, SignalRClient } from './signalrClient';
import { WebRTCPeerManager } from './webrtcPeerManager';
import { API_BASE_URL } from '../../../config';

type ProjectCallEvents = {
  ParticipantJoined: [string, string];
  JoinedProjectCall: [string, string, string[]];
  ParticipantLeft: [string, string];
  ReceiveOffer: [string, string, string, string];
  ReceiveAnswer: [string, string, string, string];
  ReceiveIceCandidate: [string, string, string, string, string | null, number | null];
  NewParticipantJoined: [string, string];
};

export class ProjectCallService {
  private signalR: SignalRClient<ProjectCallEvents>;
  private peerManager: WebRTCPeerManager;
  private currentProjectId: string | null = null;
  private myParticipantId: string | null = null;
  private connectedPeers = new Set<string>();

  constructor(getAccessToken?: () => string | Promise<string | null>) {
    this.peerManager = WebRTCPeerManager.getInstance();
    this.setupPeerManagerListeners();

    this.signalR = createSignalRClient<ProjectCallEvents>({
      hubUrl: `${API_BASE_URL}/callhub`,
      getAccessToken,
      logLevel: 1,
    });

    this.registerSignalRHandlers();
  }

  private setupPeerManagerListeners() {
    this.peerManager.on((event: any) => {
      console.log("📡 [DEBUG] PeerManager event received:", event.type, "currentProjectId:", this.currentProjectId);

      if (!this.currentProjectId) return;

      if (event.type === 'offer') this.sendOffer(event.peerId, event.sdp);
      if (event.type === 'answer') this.sendAnswer(event.peerId, event.sdp);
      if (event.type === 'ice-candidate') this.sendIceCandidate(event.peerId, event.candidate);
    });
  }

  private registerSignalRHandlers() {
    this.signalR.on("ParticipantJoined", (_, participantId) => {
      if (participantId === this.myParticipantId) return;
      // Do nothing here — NewParticipantJoined handles initiation from existing side
    });

    this.signalR.on("JoinedProjectCall", (projectId, myParticipantId, participants) => {
      console.log("✅ [DEBUG] JoinedProjectCall received");
      console.log("   → My Participant ID:", myParticipantId);
      console.log("   → Existing participants:", participants);

      this.currentProjectId = projectId;
      this.myParticipantId = myParticipantId;

      participants.forEach((pId: string) => {
        if (pId !== myParticipantId && !this.connectedPeers.has(pId)) {
          console.log("[DEBUG] New joiner connecting to existing peer as NON-INITIATOR:", pId);
          this.connectToNewPeer(pId, false);
        }
      });
    });

    this.signalR.on("NewParticipantJoined", (_, newParticipantId) => {
      console.log("[DEBUG] NewParticipantJoined received for:", newParticipantId);
      if (newParticipantId === this.myParticipantId) return;
      this.connectToNewPeer(newParticipantId, true);
    });

    this.signalR.on("ParticipantLeft", (_, participantId) => {
      this.connectedPeers.delete(participantId);
      this.peerManager.disconnectFromPeer(participantId);
    });

    this.signalR.on("ReceiveOffer", async (_, __, senderId, offerSdp) => {
      console.log("[DEBUG] ReceiveOffer arrived from:", senderId);

      if (senderId === this.myParticipantId) {
        console.log("⚠️ [DEBUG] Offer was from myself, ignoring.");
        return;
      }

      try {
        // === NEW: State check to prevent InvalidStateError ===
        const pc = (this.peerManager as any).peers?.get(senderId);
        if (pc && (pc.signalingState === 'have-remote-offer' || pc.signalingState === 'stable')) {
          console.warn(`[DEBUG] Ignoring offer from ${senderId} - wrong state: ${pc.signalingState}`);
          return;
        }

        await this.peerManager.acceptOffer(senderId, JSON.parse(offerSdp));
        console.log("✅ [DEBUG] Offer accepted successfully from:", senderId);
      } catch (e: any) {
        console.error("❌ [DEBUG] Error accepting offer:", e.message);
      }
    });

    // === UPDATED: Added signaling state check ===
    this.signalR.on("ReceiveAnswer", async (_, __, senderId, answerSdp) => {
      if (senderId === this.myParticipantId) return;

      try {
        const pc = (this.peerManager as any).peers?.get(senderId);
        if (pc && pc.signalingState !== 'have-local-offer') {
          console.warn(`[DEBUG] Ignoring answer from ${senderId} - wrong state: ${pc.signalingState}`);
          return;
        }

        await this.peerManager.setRemoteAnswer(senderId, JSON.parse(answerSdp));
        console.log("✅ [DEBUG] Offer accepted successfully from:", senderId);
      } catch (e: any) {
        console.error("❌ [DEBUG] Error setting remote answer:", e.message);
      }
    });

    this.signalR.on("ReceiveIceCandidate", async (_, __, senderId, candidate, sdpMid, sdpMLineIndex) => {
      if (senderId === this.myParticipantId) return;
      try {
        await this.peerManager.handleRemoteIceCandidate(senderId, { candidate, sdpMid, sdpMLineIndex });
      } catch (e) {
        console.error("Error handling ICE candidate:", e);
      }
    });
  }

  public async joinCall(projectId: string): Promise<void> {
    if (this.currentProjectId === projectId) return;

    await this.leaveCall();
    this.currentProjectId = projectId;
    this.connectedPeers.clear();

    await this.peerManager.getLocalStream();
    await this.signalR.start();
    await this.signalR.invoke("JoinProjectCall", projectId);
  }

  public async leaveCall(): Promise<void> {
    if (this.currentProjectId) {
      await this.signalR.invoke("LeaveProjectCall", this.currentProjectId).catch(() => {});
    }
    this.peerManager.cleanup();
    this.connectedPeers.clear();
    this.currentProjectId = null;
    this.myParticipantId = null;
  }

  private async connectToNewPeer(participantId: string, isInitiator: boolean) {
    if (this.connectedPeers.has(participantId)) {
      console.log("⚠️ [DEBUG] Already connected to peer:", participantId);
      return;
    }
    console.log(`🔌 [DEBUG] connectToNewPeer called → ID: ${participantId}, isInitiator: ${isInitiator}`);
    this.connectedPeers.add(participantId);
    await this.peerManager.connectToPeer(participantId, isInitiator);
  }

  private sendOffer(participantId: string, sdp: any) {
    console.log("📤 [DEBUG] Sending offer to participant:", participantId);
    this.signalR.invoke("SendOffer", this.currentProjectId, participantId, JSON.stringify(sdp));
  }

  private sendAnswer(participantId: string, sdp: any) {
    this.signalR.invoke("SendAnswer", this.currentProjectId, participantId, JSON.stringify(sdp));
  }

  private sendIceCandidate(participantId: string, candidate: any) {
    this.signalR.invoke("SendIceCandidate", this.currentProjectId, participantId,
      candidate.candidate, candidate.sdpMid, candidate.sdpMLineIndex);
  }

  public async getActiveParticipants(projectId: string): Promise<string[]> {
    try {
      return await this.signalR.invoke("GetActiveParticipants", projectId);
    } catch {
      return [];
    }
  }

  public getPeerManager() {
    return this.peerManager;
  }

  public async disconnect() {
    await this.leaveCall();
    await this.signalR.stop();
  }
}