import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectCallService } from '../services/projectCallService';

// === GLOBAL SINGLETON ===
let globalCallService: ProjectCallService | null = null;

export function useProjectCall(projectId: number | string) {
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === Camera State ===
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [activeVideoDeviceId, setActiveVideoDeviceId] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const callServiceRef = useRef<ProjectCallService | null>(null);
  const listenerRef = useRef<any>(null);

  const getAccessToken = useCallback((): string | Promise<string | null> => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve(null);
    return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
  }, []);

  // Create service once (global singleton)
  if (!callServiceRef.current) {
    if (!globalCallService) {
      globalCallService = new ProjectCallService(getAccessToken);
    }
    callServiceRef.current = globalCallService;
  }

  useEffect(() => {
    const service = callServiceRef.current!;
    const peerManager = service.getPeerManager();

    if (!listenerRef.current) {
      listenerRef.current = (event: any) => {
        if (event.type === 'track') {
          console.log('REMOTE STREAM RECEIVED');
          setRemoteStream(event.stream);
        }
        if (event.type === 'connection-state-change') {
          setConnectionState(event.state);
        }
      };
    }

    peerManager.on(listenerRef.current);

    return () => {
      // Cleanup can be improved later
    };
  }, []);

  const joinCall = useCallback(async () => {
    if (!callServiceRef.current) return;

    setIsFetching(true);
    setError(null);
    setConnectionState('connecting');

    try {
      await callServiceRef.current.joinCall(projectId.toString());
      setIsJoined(true);

      const stream = callServiceRef.current.getPeerManager().getLocalStreamSync();
      if (stream) {
        setLocalStream(stream);
      }

      // Sync initial camera state
      const pm = callServiceRef.current.getPeerManager();
      setCameraEnabled(pm.isCameraEnabled());
      setActiveVideoDeviceId(pm.getCurrentVideoDeviceId());
    } catch (err: any) {
      console.error("Failed to join call:", err);
      setError(err.message || "Failed to connect to call");
      setConnectionState('failed');
    } finally {
      setIsFetching(false);
    }
  }, [projectId]);

  const leaveCall = useCallback(async () => {
    if (callServiceRef.current) {
      await callServiceRef.current.leaveCall();
    }
    setIsJoined(false);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('disconnected');
    setError(null);
    setCameraEnabled(true);
    setActiveVideoDeviceId(null);
  }, []);

  // === NEW: ringUsers ===
  const ringUsers = useCallback(async (targetUserIds: string[]) => {
    if (!callServiceRef.current) return;
    await callServiceRef.current.ringUsers(projectId.toString(), targetUserIds);
  }, [projectId]);

  // === NEW: Check if a call is already active for this project ===
  const checkActiveParticipants = useCallback(async (): Promise<string[]> => {
    if (!callServiceRef.current) return [];
    return await callServiceRef.current.getActiveParticipants(projectId.toString());
  }, [projectId]);

  // ==================== CAMERA CONTROLS ====================

  const turnCameraOff = useCallback(async () => {
    const pm = callServiceRef.current?.getPeerManager();
    if (!pm) return;

    await pm.setCameraEnabled(false);
    setCameraEnabled(false);
    setActiveVideoDeviceId(null);
  }, []);

  const turnCameraOn = useCallback(async () => {
    const pm = callServiceRef.current?.getPeerManager();
    if (!pm) return;

    await pm.setCameraEnabled(true);
    setCameraEnabled(true);
    setActiveVideoDeviceId(pm.getCurrentVideoDeviceId());
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    const pm = callServiceRef.current?.getPeerManager();
    if (!pm) return;

    await pm.switchCamera(deviceId);
    setActiveVideoDeviceId(deviceId);
    setCameraEnabled(true);
  }, []);

  const refreshVideoDevices = useCallback(async () => {
    const pm = callServiceRef.current?.getPeerManager();
    if (!pm) return;

    const devices = await pm.getVideoDevices();
    setVideoDevices(devices);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // We keep the global service alive across remounts
    };
  }, []);

  return {
    joinCall,
    leaveCall,
    ringUsers,
    isJoined,
    localStream,
    remoteStream,
    connectionState,
    isFetching,
    error,
    checkActiveParticipants,

    // === Camera controls (NEW) ===
    cameraEnabled,
    activeVideoDeviceId,
    videoDevices,
    refreshVideoDevices,
    turnCameraOff,
    turnCameraOn,
    switchCamera,
  };
}