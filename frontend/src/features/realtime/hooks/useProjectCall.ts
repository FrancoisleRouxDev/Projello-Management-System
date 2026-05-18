// src/features/realtime/hooks/useProjectCall.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectCallService } from '../services/projectCallService';

export function useProjectCall(projectId: number | string) {
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callServiceRef = useRef<ProjectCallService | null>(null);

  const getAccessToken = useCallback((): string | Promise<string | null> => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve(null);
    return token.startsWith('"') && token.endsWith('"')
      ? token.slice(1, -1)
      : token;
  }, []);

  // Initialize service
  useEffect(() => {
    if (!callServiceRef.current) {
      callServiceRef.current = new ProjectCallService(getAccessToken);
    }

    const service = callServiceRef.current;
    const peerManager = service.getPeerManager();

    // Fixed: Don't assume it returns a function
    const listener = (event: any) => {
      if (event.type === 'track') {
        setRemoteStream(event.stream);
      }
      if (event.type === 'connection-state-change') {
        setConnectionState(event.state);
      }
    };

    peerManager.on(listener);

    return () => {
      // We can't reliably unsubscribe, so we'll just cleanup on unmount
    };
  }, [getAccessToken]);

  const joinCall = useCallback(async () => {
    if (!callServiceRef.current) return;

    setIsFetching(true);
    setError(null);

    try {
      await callServiceRef.current.joinCall(projectId.toString());
      setIsJoined(true);

      const stream = callServiceRef.current.getPeerManager().getLocalStreamSync();
      if (stream) setLocalStream(stream);
    } catch (err: any) {
      console.error("Failed to join call:", err);
      setError(err.message || "Failed to join call");
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

  // Full cleanup
  useEffect(() => {
    return () => {
      callServiceRef.current?.disconnect();
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