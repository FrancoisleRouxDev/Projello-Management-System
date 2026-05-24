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
      if (!this.currentProjectId) return;
      if (event.type === 'offer') this.sendOffer(event.peerId, event.sdp);
      if (event.type === 'answer') this.sendAnswer(event.peerId, event.sdp);
      if (event.type === 'ice-candidate') this.sendIceCandidate(event.peerId, event.candidate);
    });
  }

  private registerSignalRHandlers() {
    // We no longer initiate from ParticipantJoined to avoid double offers
    this.signalR.on("ParticipantJoined", (_, participantId) => {
      if (participantId === this.myParticipantId) return;
      // Do nothing here — NewParticipantJoined handles initiation from existing side
    });

    this.signalR.on("JoinedProjectCall", (projectId, myParticipantId, participants) => {
      this.currentProjectId = projectId;
      this.myParticipantId = myParticipantId;

      // New joiner: connect to existing people as NON-initiator (only receive offers)
      participants.forEach((pId: string) => {
        if (pId !== myParticipantId && !this.connectedPeers.has(pId)) {
          this.connectToNewPeer(pId, false); // false = do NOT create offer
        }
      });
    });

    // Existing people initiate offer when they see someone new joined
    this.signalR.on("NewParticipantJoined", (_, newParticipantId) => {
      if (newParticipantId === this.myParticipantId) return;
      this.connectToNewPeer(newParticipantId, true); // true = create offer
    });

    this.signalR.on("ParticipantLeft", (_, participantId) => {
      this.connectedPeers.delete(participantId);
      this.peerManager.disconnectFromPeer(participantId);
    });

    this.signalR.on("ReceiveOffer", async (_, __, senderId, offerSdp) => {
      if (senderId === this.myParticipantId) return;   // ← Only check if it's ourselves

      try {
        await this.peerManager.acceptOffer(senderId, JSON.parse(offerSdp));
      } catch (e) {
        console.error("Error accepting offer:", e);
      }
    });

    this.signalR.on("ReceiveAnswer", async (_, __, senderId, answerSdp) => {
      if (senderId === this.myParticipantId) return;
      try {
        await this.peerManager.setRemoteAnswer(senderId, JSON.parse(answerSdp));
      } catch (e) {
        console.error("Error setting remote answer:", e);
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
    if (this.connectedPeers.has(participantId)) return;
    this.connectedPeers.add(participantId);
    await this.peerManager.connectToPeer(participantId, isInitiator);
  }

  private sendOffer(participantId: string, sdp: any) {
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