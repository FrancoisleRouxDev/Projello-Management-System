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
  private myConnectionId: string | null = null;
  private isCallStarter: boolean = false;
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
      if (event.type === 'offer') this.sendOffer(event.peerId, event.sdp);
      if (event.type === 'answer') this.sendAnswer(event.peerId, event.sdp);
      if (event.type === 'ice-candidate') this.sendIceCandidate(event.peerId, event.candidate);
    });
  }

  private registerSignalRHandlers() {
    this.signalR.on("ParticipantJoined", (projectId, connectionId, participantId) => {
      console.log(`🟢 NEW PARTICIPANT JOINED: ${participantId}`);
      // Existing members always initiate to new joiners
      this.connectToNewPeer(connectionId, true);
    });

    this.signalR.on("JoinedProjectCall", (projectId, connectionId, participantId, currentParticipants) => {
      console.log(`✅ YOU JOINED. Current participants: ${currentParticipants.length}`);
      this.currentProjectId = projectId;
      this.myConnectionId = connectionId;

      // Determine if we are the starter (first person in the room)
      this.isCallStarter = currentParticipants.length <= 1;

      currentParticipants.forEach(peerId => {
        if (peerId !== connectionId) {
          // Only the starter creates offers when joining an existing call
          const shouldInitiate = this.isCallStarter;
          this.connectToNewPeer(peerId, shouldInitiate);
        }
      });
    });

    this.signalR.on("ReceiveOffer", async (_, senderConnId, senderPartId, offerSdp) => {
      console.log(`📥 RECEIVED OFFER from ${senderPartId}`);
      await this.peerManager.acceptOffer(senderConnId, JSON.parse(offerSdp));
    });

    this.signalR.on("ReceiveAnswer", async (_, senderConnId, senderPartId, answerSdp) => {
      console.log(`📥 RECEIVED ANSWER from ${senderPartId}`);
      await this.peerManager.setRemoteAnswer(senderConnId, JSON.parse(answerSdp));
    });

    this.signalR.on("ReceiveIceCandidate", async (_, senderConnId, senderPartId, candidate, sdpMid, sdpMLineIndex) => {
      console.log(`📥 RECEIVED ICE from ${senderPartId}`);
      await this.peerManager.handleRemoteIceCandidate(senderConnId, { candidate, sdpMid, sdpMLineIndex });
    });
  }

  public async joinCall(projectId: string): Promise<void> {
    if (this.currentProjectId === projectId) return;
    await this.leaveCall();
    this.currentProjectId = projectId;
    this.connectedPeers.clear();
    this.isCallStarter = false;
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
    this.myConnectionId = null;
    this.isCallStarter = false;
  }

  private async connectToNewPeer(peerConnectionId: string, isInitiator: boolean) {
    if (this.connectedPeers.has(peerConnectionId)) {
      console.log(`⚠️ Already connected to ${peerConnectionId}, skipping`);
      return;
    }
    this.connectedPeers.add(peerConnectionId);
    console.log(`🔗 Connecting to ${peerConnectionId} (isInitiator: ${isInitiator})`);
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
    this.signalR.invoke("SendIceCandidate", this.currentProjectId, peerId, candidate.candidate, candidate.sdpMid, candidate.sdpMLineIndex);
  }

  public getPeerManager() {
    return this.peerManager;
  }

  public async disconnect() {
    await this.leaveCall();
    await this.signalR.stop();
  }
}