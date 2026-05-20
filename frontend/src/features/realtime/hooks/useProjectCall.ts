// frontend/src/features/realtime/hooks/useProjectCall.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectCallService } from '../services/projectCallService';

export function useProjectCall(projectId: number | string) {
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callServiceRef = useRef<ProjectCallService | null>(null);
  const listenerRef = useRef<any>(null);

  const getAccessToken = useCallback((): string | Promise<string | null> => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve(null);
    return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
  }, []);

  // Create service once
  if (!callServiceRef.current) {
    callServiceRef.current = new ProjectCallService(getAccessToken);
  }

  useEffect(() => {
    const service = callServiceRef.current!;
    const peerManager = service.getPeerManager();

    if (!listenerRef.current) {
      listenerRef.current = (event: any) => {
        if (event.type === 'track') {
          console.log('📹 REMOTE STREAM RECEIVED');
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

      // Get local stream (now requested early in the service)
      const stream = callServiceRef.current.getPeerManager().getLocalStreamSync();
      if (stream) {
        setLocalStream(stream);
      }
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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      callServiceRef.current?.disconnect();
      callServiceRef.current = null;
    };
  }, []);

  return {
    joinCall,
    leaveCall,
    isJoined,
    localStream,
    remoteStream,
    connectionState,
    isFetching,
    error,
  };
}