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
    this.signalR.on("ParticipantJoined", (_, participantId) => {
      if (participantId === this.myParticipantId) return;
      this.connectToNewPeer(participantId, true);
    });

    this.signalR.on("JoinedProjectCall", (projectId, myParticipantId, participants) => {
    this.currentProjectId = projectId;
    this.myParticipantId = myParticipantId;
    // Do NOT initiate offers here. Only existing people should initiate.
});

    this.signalR.on("ParticipantLeft", (_, participantId) => {
      this.connectedPeers.delete(participantId);
      this.peerManager.disconnectFromPeer(participantId);
    });

    this.signalR.on("ReceiveOffer", async (_, __, senderId, offerSdp) => {
      if (senderId === this.myParticipantId || this.connectedPeers.has(senderId)) return;

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

  public getPeerManager() {
    return this.peerManager;
  }

  public async disconnect() {
    await this.leaveCall();
    await this.signalR.stop();
  }
}