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
  IncomingProjectCall: [string, string, string]; // ← ADDED
};

export class ProjectCallService {
  private signalR: SignalRClient<ProjectCallEvents>;
  private peerManager: WebRTCPeerManager;
  private currentProjectId: string | null = null;
  private myParticipantId: string | null = null;
  private connectedPeers = new Set<string>();
  private connectingPeers = new Set<string>();

  // === NEW: ICE Candidate Queue ===
  private pendingIceCandidates: Map<string, any[]> = new Map();

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

      // Only initiate if we're not already connected or connecting
      if (this.connectedPeers.has(newParticipantId) || this.connectingPeers.has(newParticipantId)) {
        console.log("[DEBUG] Skipping offer initiation to", newParticipantId, "(already connected or connecting)");
        return;
      }

      // Small delay to reduce race conditions when multiple people join at the same time
      setTimeout(() => {
        // Double-check before initiating (in case state changed during the delay)
        if (!this.connectedPeers.has(newParticipantId) && !this.connectingPeers.has(newParticipantId)) {
          this.connectToNewPeer(newParticipantId, true);
        }
      }, 400); // 400ms delay
    });

    this.signalR.on("ParticipantLeft", (_, participantId) => {
      this.connectedPeers.delete(participantId);
      this.pendingIceCandidates.delete(participantId);
      this.peerManager.disconnectFromPeer(participantId);
    });

    this.signalR.on("ReceiveOffer", async (_, __, senderId, offerSdp) => {
      console.log("[DEBUG] ReceiveOffer arrived from:", senderId);

      if (senderId === this.myParticipantId) {
        console.log("⚠️ [DEBUG] Offer was from myself, ignoring.");
        return;
      }

      try {
        await this.peerManager.acceptOffer(senderId, JSON.parse(offerSdp));
        console.log("✅ [DEBUG] Offer accepted successfully from:", senderId);

        // Flush any queued ICE candidates after setting remote description
        this.flushPendingIceCandidates(senderId);
      } catch (e: any) {
        console.error("❌ [DEBUG] Error accepting offer:", e.message);
      }
    });

    this.signalR.on("ReceiveAnswer", async (_, __, senderId, answerSdp) => {
      if (senderId === this.myParticipantId) return;

      try {
        const pc = (this.peerManager as any).peers?.get(senderId);

        // Only accept answer if we're expecting one
        if (!pc || pc.signalingState !== 'have-local-offer') {
          console.warn(`[DEBUG] Ignoring answer from ${senderId} (state: ${pc?.signalingState || 'unknown'})`);
          return;
        }

        await this.peerManager.setRemoteAnswer(senderId, JSON.parse(answerSdp));
        console.log("[DEBUG] Answer accepted successfully from:", senderId);
        this.flushPendingIceCandidates(senderId);
      } catch (e: any) {
        console.error("[DEBUG] Error setting remote answer:", e.message);
      }
    });

    this.signalR.on("ReceiveIceCandidate", async (_, __, senderId, candidate, sdpMid, sdpMLineIndex) => {
      if (senderId === this.myParticipantId) return;

      const pc = (this.peerManager as any).peers?.get(senderId);

      if (pc && pc.remoteDescription) {
        // Remote description is ready, add immediately
        try {
          await this.peerManager.handleRemoteIceCandidate(senderId, { candidate, sdpMid, sdpMLineIndex });
        } catch (e: any) {
          console.error("Error adding ICE candidate:", e.message);
        }
      } else {
        // Queue it for later
        if (!this.pendingIceCandidates.has(senderId)) {
          this.pendingIceCandidates.set(senderId, []);
        }
        this.pendingIceCandidates.get(senderId)!.push({ candidate, sdpMid, sdpMLineIndex });
        console.log("[DEBUG] Queued ICE candidate for later:", senderId);
      }
    });
  }

  // === NEW: Flush queued ICE candidates ===
  private async flushPendingIceCandidates(peerId: string) {
    const queued = this.pendingIceCandidates.get(peerId);
    if (!queued || queued.length === 0) return;

    console.log(`[DEBUG] Flushing ${queued.length} queued ICE candidates for ${peerId}`);

    for (const cand of queued) {
      try {
        await this.peerManager.handleRemoteIceCandidate(peerId, cand);
      } catch (e: any) {
        console.error("Error flushing ICE candidate:", e.message);
      }
    }

    this.pendingIceCandidates.delete(peerId);
  }

  public async joinCall(projectId: string): Promise<void> {
    if (this.currentProjectId === projectId) return;

    await this.leaveCall();
    this.currentProjectId = projectId;
    this.connectedPeers.clear();
    this.pendingIceCandidates.clear();

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
    this.pendingIceCandidates.clear();
    this.currentProjectId = null;
    this.myParticipantId = null;
  }

  private async connectToNewPeer(participantId: string, isInitiator: boolean) {
    if (this.connectedPeers.has(participantId) || this.connectingPeers.has(participantId)) {
      console.log("[DEBUG] Already connected or connecting to:", participantId);
      return;
    }

    this.connectingPeers.add(participantId);

    try {
      await this.peerManager.connectToPeer(participantId, isInitiator);
      this.connectedPeers.add(participantId);
    } finally {
      this.connectingPeers.delete(participantId);
    }
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

  // ==================== NEW METHOD ====================
  public async ringUsers(projectId: string, targetUserIds: string[]): Promise<void> {
    // Make sure SignalR is connected before trying to send the ring command
    if (this.signalR.state !== "Connected") {
      console.log("[DEBUG] Starting SignalR connection before ringing...");
      await this.signalR.start();
    }

    await this.signalR.invoke("RingUsers", projectId, targetUserIds);
    console.log("[DEBUG] RingUsers sent successfully to:", targetUserIds);
  }

  public getPeerManager() {
    return this.peerManager;
  }

  public async disconnect() {
    await this.leaveCall();
    await this.signalR.stop();
  }
}

//Update