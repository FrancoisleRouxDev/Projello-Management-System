// frontend/src/features/realtime/services/projectCallService.ts
import { createSignalRClient, SignalRClient } from './signalrClient';
import { WebRTCPeerManager } from './webrtcPeerManager';
import { API_BASE_URL } from '../../../config';

type ProjectCallEvents = {
  ParticipantJoined: [string, string, string];
  JoinedProjectCall: [string, string, string, string[]];
  ParticipantLeft: [string, string, string];
  ReceiveOffer: [string, string, string, string];
  ReceiveAnswer: [string, string, string, string];
  ReceiveIceCandidate: [string, string, string, string, string | null, number | null];
};

export class ProjectCallService {
  private signalR: SignalRClient<ProjectCallEvents>;
  private peerManager: WebRTCPeerManager;
  private currentProjectId: string | null = null;
  private connectedPeers = new Set<string>();

  constructor(getAccessToken?: () => string | Promise<string | null>) {
    this.peerManager = new WebRTCPeerManager();
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

      switch (event.type) {
        case 'ice-candidate':
          this.sendIceCandidate(event.peerId, event.candidate);
          break;
        case 'offer':
          this.sendOffer(event.peerId, event.sdp);
          break;
        case 'answer':
          this.sendAnswer(event.peerId, event.sdp);
          break;
      }
    });
  }

  private registerSignalRHandlers() {
    this.signalR.on("ParticipantJoined", (projectId, connectionId, participantId) => {
      console.log(`🟢 Participant joined: ${participantId}`);
      this.connectToNewPeer(connectionId, true);
    });

    this.signalR.on("JoinedProjectCall", (projectId, connectionId, participantId, currentParticipants) => {
      console.log(`✅ Joined call with ${currentParticipants.length} participants`);
      this.currentProjectId = projectId;

      currentParticipants.forEach(peerId => {
        if (peerId !== connectionId) {
          this.connectToNewPeer(peerId, true);
        }
      });
    });

    this.signalR.on("ParticipantLeft", (projectId, connectionId, participantId) => {
      console.log(`🔴 Participant left: ${participantId}`);
      this.peerManager.disconnectFromPeer(connectionId);
      this.connectedPeers.delete(connectionId);
    });

    // WebRTC Signaling
    this.signalR.on("ReceiveOffer", async (_projectId, senderConnId, senderPartId, offerSdp) => {
      console.log(`📥 Received Offer from ${senderPartId}`);
      await this.peerManager.acceptOffer(senderConnId, JSON.parse(offerSdp));
    });

    this.signalR.on("ReceiveAnswer", async (_projectId, senderConnId, senderPartId, answerSdp) => {
      console.log(`📥 Received Answer from ${senderPartId}`);
      await this.peerManager.setRemoteAnswer(senderConnId, JSON.parse(answerSdp));
    });

    this.signalR.on("ReceiveIceCandidate", async (_projectId, senderConnId, senderPartId, candidate, sdpMid, sdpMLineIndex) => {
      await this.peerManager.handleRemoteIceCandidate(senderConnId, {
        candidate,
        sdpMid,
        sdpMLineIndex
      });
    });
  }

  public async joinCall(projectId: string): Promise<void> {
    if (this.currentProjectId === projectId) return;

    await this.leaveCall();
    this.currentProjectId = projectId;

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
  }

  private async connectToNewPeer(peerConnectionId: string, isInitiator: boolean) {
    if (this.connectedPeers.has(peerConnectionId)) return;
    this.connectedPeers.add(peerConnectionId);
    await this.peerManager.connectToPeer(peerConnectionId, isInitiator);
  }

  private sendOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.currentProjectId) return;
    this.signalR.invoke("SendOffer", this.currentProjectId, peerId, JSON.stringify(sdp));
  }

  private sendAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.currentProjectId) return;
    this.signalR.invoke("SendAnswer", this.currentProjectId, peerId, JSON.stringify(sdp));
  }

  private sendIceCandidate(peerId: string, candidate: RTCIceCandidate) {
    if (!this.currentProjectId) return;
    this.signalR.invoke(
      "SendIceCandidate",
      this.currentProjectId,
      peerId,
      candidate.candidate,
      candidate.sdpMid,
      candidate.sdpMLineIndex
    );
  }

  public getPeerManager() {
    return this.peerManager;
  }

  public async disconnect() {
    await this.leaveCall();
    await this.signalR.stop();
  }
}