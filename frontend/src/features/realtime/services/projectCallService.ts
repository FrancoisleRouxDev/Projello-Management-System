// frontend/src/features/realtime/services/projectCallService.ts
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
    this.signalR.on("ParticipantJoined", (_, participantId) => {
      console.log(`NEW PARTICIPANT: ${participantId}`);
      this.connectToNewPeer(participantId, true);
    });

    this.signalR.on("JoinedProjectCall", (projectId, myParticipantId, participants) => {
      this.currentProjectId = projectId;
      this.myParticipantId = myParticipantId;
      console.log(`Joined project call. Participants: ${participants.length}`);

      participants.forEach(id => {
        if (id !== myParticipantId) this.connectToNewPeer(id, false);
      });
    });

    this.signalR.on("ReceiveOffer", async (_, __, senderId, offerSdp) => {
      if (senderId === this.myParticipantId) return;
      console.log(`RECEIVED OFFER from ${senderId}`);
      try {
        await this.peerManager.acceptOffer(senderId, JSON.parse(offerSdp));
      } catch (e) { console.error(e); }
    });

    this.signalR.on("ReceiveAnswer", async (_, __, senderId, answerSdp) => {
      if (senderId === this.myParticipantId) return;
      console.log(`RECEIVED ANSWER from ${senderId}`);
      try {
        await this.peerManager.setRemoteAnswer(senderId, JSON.parse(answerSdp));
      } catch (e) { console.error(e); }
    });

    this.signalR.on("ReceiveIceCandidate", async (_, __, senderId, candidate, sdpMid, sdpMLineIndex) => {
      if (senderId === this.myParticipantId) return;
      try {
        await this.peerManager.handleRemoteIceCandidate(senderId, { candidate, sdpMid, sdpMLineIndex });
      } catch (e) { console.error(e); }
    });
  }

  public async joinCall(projectId: string): Promise<void> {
    if (this.currentProjectId === projectId) return;

    await this.leaveCall();
    this.currentProjectId = projectId;
    this.connectedPeers.clear();

    // Request camera early
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
    console.log(">>> [FRONTEND] sendOffer called → target:", participantId);
    this.signalR.invoke("SendOffer", this.currentProjectId, participantId, JSON.stringify(sdp))
        .then(() => console.log(">>> [FRONTEND] SendOffer invoke SUCCESS"))
        .catch(err => console.error(">>> [FRONTEND] SendOffer invoke FAILED:", err));
}

private sendAnswer(participantId: string, sdp: any) {
    console.log(">>> [FRONTEND] sendAnswer called → target:", participantId);
    this.signalR.invoke("SendAnswer", this.currentProjectId, participantId, JSON.stringify(sdp))
        .then(() => console.log(">>> [FRONTEND] SendAnswer invoke SUCCESS"))
        .catch(err => console.error(">>> [FRONTEND] SendAnswer invoke FAILED:", err));
}

private sendIceCandidate(participantId: string, candidate: any) {
    this.signalR.invoke("SendIceCandidate", this.currentProjectId, participantId,
        candidate.candidate, candidate.sdpMid, candidate.sdpMLineIndex)
        .catch(err => console.error(">>> [FRONTEND] SendIceCandidate FAILED:", err));
}

  public getPeerManager() {
    return this.peerManager;
  }

  public async disconnect() {
    await this.leaveCall();
    await this.signalR.stop();
  }
}