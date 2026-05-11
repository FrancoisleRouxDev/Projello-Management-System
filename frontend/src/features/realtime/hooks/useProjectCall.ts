// src/features/realtime/hooks/useProjectCall.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { WebRTCPeerManager } from '../services/webrtcPeerManager';
import { API_BASE_URL } from '../../../config';

export interface CallState {
  isJoined: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
}

interface ProjectMember {
  UserID: string;
  FullName: string;
  AssignedAs: string;
}

interface ProjectData {
  ProjectID: number;
  Name: string;
  Members: ProjectMember[];
}

export function useProjectCall(projectId: number) {
  const [callState, setCallState] = useState<CallState>({
    isJoined: false,
    remoteStream: null,
    localStream: null,
    connectionState: 'disconnected',
  });

  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<HubConnection | null>(null);
  const peerManagerRef = useRef<WebRTCPeerManager | null>(null);

  const getAuthToken = (): string | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
  };

  const fetchProjectData = useCallback(async () => {
    if (projectData) return;

    setIsFetching(true);
    setError(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setProjectData(data);
      console.log("✅ Project data fetched successfully");
    } catch (err: any) {
      console.error('Failed to fetch project data:', err);
      setError('Failed to load project details');
    } finally {
      setIsFetching(false);
    }
  }, [projectId, projectData]);

  const joinCall = useCallback(async () => {
    setError(null);
    const token = getAuthToken();
    if (!token) {
      setError("No authentication token found. Please log in again.");
      return;
    }

    await fetchProjectData();

    const hubUrl = `${API_BASE_URL}/callhub`;

    if (!peerManagerRef.current) {
      peerManagerRef.current = new WebRTCPeerManager();
    }
    const peerManager = peerManagerRef.current;

    if (!connectionRef.current) {
      connectionRef.current = new HubConnectionBuilder()
        .withUrl(hubUrl, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .build();
    }
    const connection = connectionRef.current;

    try {
      console.log("🔄 Starting SignalR connection...");
      await connection.start();
      console.log("✅ SignalR Connected successfully!");

      console.log(`🔄 Sending JoinProjectCall for project: ${projectId}`);
      await connection.invoke('JoinProjectCall', projectId.toString());
      console.log("✅ Successfully joined project call room!");

      setCallState(prev => ({ ...prev, isJoined: true, connectionState: 'connected' }));

      // ==================== SignalR Event Handlers ====================
      connection.on('ReceiveOffer', async (pid: string, fromConnectionId: string, fromParticipantId: string, offerSdp: string) => {
        console.log(`📥 Received Offer from ${fromParticipantId}`);
        await peerManager.connectToPeer(fromConnectionId, false);
        const answer = await peerManager.acceptOffer(fromConnectionId, { type: 'offer', sdp: offerSdp });
        if (answer) {
          await connection.invoke('SendAnswer', projectId.toString(), fromConnectionId, answer.sdp);
        }
      });

      connection.on('ReceiveAnswer', async (pid: string, fromConnectionId: string, fromParticipantId: string, answerSdp: string) => {
        console.log(`📥 Received Answer from ${fromParticipantId}`);
        await peerManager.setRemoteAnswer(fromConnectionId, { type: 'answer', sdp: answerSdp });
      });

      connection.on('ReceiveIceCandidate', async (
        pid: string, fromConnectionId: string, fromParticipantId: string, 
        candidate: string, sdpMid: string | null, sdpMLineIndex: number | null
      ) => {
        await peerManager.handleRemoteIceCandidate(fromConnectionId, { 
          candidate, 
          sdpMid, 
          sdpMLineIndex: sdpMLineIndex ?? undefined 
        });
      });

      connection.on('ParticipantJoined', async (pid: string, connectionId: string, participantId: string) => {
        console.log(`👤 New participant joined: ${participantId}`);
        await peerManager.connectToPeer(connectionId, true);
      });

      connection.on('ParticipantLeft', (pid: string, connectionId: string) => {
        console.log(`👤 Participant left: ${connectionId}`);
        peerManager.disconnectFromPeer(connectionId);
      });

      // WebRTC Peer Manager Events
      peerManager.on(async (event) => {
        if (event.type === 'track') {
          console.log("📹 Received remote stream");
          setCallState(prev => ({ ...prev, remoteStream: event.stream }));
        }
        if (event.type === 'connection-state-change') {
          setCallState(prev => ({ ...prev, connectionState: event.state as any }));
        }
        if (event.type === 'offer') {
          await connection.invoke('SendOffer', projectId.toString(), event.peerId, event.sdp.sdp);
        }
        if (event.type === 'ice-candidate') {
          await connection.invoke(
            'SendIceCandidate',
            projectId.toString(),
            event.peerId,
            event.candidate.candidate,
            event.candidate.sdpMid ?? null,
            event.candidate.sdpMLineIndex ?? null
          );
        }
      });

      const localStream = await peerManager.getLocalStream();
      setCallState(prev => ({ ...prev, localStream }));
      console.log("🎤 Local stream acquired");

    } catch (err: any) {
      console.error("❌ Failed to join call:", err);
      setError(err.message || 'Failed to connect to call server');
      setCallState(prev => ({ ...prev, connectionState: 'failed' }));
    }
  }, [projectId, fetchProjectData]);

  const leaveCall = useCallback(async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.invoke('LeaveProjectCall', projectId.toString());
        await connectionRef.current.stop();
      } catch (_) {}
      connectionRef.current = null;
    }

    if (peerManagerRef.current) {
      peerManagerRef.current.cleanup();
      peerManagerRef.current = null;
    }

    setCallState({
      isJoined: false,
      remoteStream: null,
      localStream: null,
      connectionState: 'disconnected',
    });
    setProjectData(null);
  }, [projectId]);

  useEffect(() => {
    return () => { leaveCall(); };
  }, [leaveCall]);

  return {
    joinCall,
    leaveCall,
    isJoined: callState.isJoined,
    localStream: callState.localStream,
    remoteStream: callState.remoteStream,
    connectionState: callState.connectionState,
    isFetching,
    error,
    members: projectData?.Members || [],
  };
}