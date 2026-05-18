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

  // Initialize service + listener ONCE
  useEffect(() => {
    if (!callServiceRef.current) {
      callServiceRef.current = new ProjectCallService(getAccessToken);
    }

    const peerManager = callServiceRef.current.getPeerManager();

    // Remove old listener if exists
    if (listenerRef.current) {
      // (we don't have off() implemented, so we just keep adding - it's fine for now)
    }

    listenerRef.current = (event: any) => {
      console.log('🔥 useProjectCall received:', event.type, event.state || '');

      if (event.type === 'track') {
        console.log('📹 REMOTE STREAM RECEIVED!');
        setRemoteStream(event.stream);
      }

      if (event.type === 'connection-state-change') {
        console.log('🔄 UI STATE UPDATED →', event.state);
        setConnectionState(event.state as any);
      }
    };

    peerManager.on(listenerRef.current);

    return () => {
      // cleanup on unmount
      callServiceRef.current?.disconnect();
    };
  }, [getAccessToken]);

  const joinCall = useCallback(async () => {
    if (!callServiceRef.current) return;

    setIsFetching(true);
    setError(null);
    setConnectionState('connecting');   // ← This fixes the "still disconnected" text

    try {
      await callServiceRef.current.joinCall(projectId.toString());
      setIsJoined(true);

      const stream = callServiceRef.current.getPeerManager().getLocalStreamSync();
      if (stream) setLocalStream(stream);
    } catch (err: any) {
      console.error("Failed to join call:", err);
      setError(err.message || "Failed to connect");
      setConnectionState('failed');
    } finally {
      setIsFetching(false);
    }
  }, [projectId]);

  const leaveCall = useCallback(async () => {
    if (callServiceRef.current) await callServiceRef.current.leaveCall();

    setIsJoined(false);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('disconnected');
    setError(null);
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