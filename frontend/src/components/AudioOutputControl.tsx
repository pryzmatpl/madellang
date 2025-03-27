import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AudioOutputProps {
  isMuted: boolean;
  onToggleMute: () => void;
  roomId?: string;            // Make these optional to prevent errors
  targetLanguage?: string;
}

const AudioOutputControl: React.FC<AudioOutputProps> = ({
  isMuted,
  onToggleMute,
  roomId,
  targetLanguage = "en"
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const websocket = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Send ping every 15 seconds to keep connection alive
  const startPingInterval = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }
    
    pingInterval.current = setInterval(() => {
      if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
        console.log('Sending ping to keep connection alive');
        websocket.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000); // 15 seconds
  }, []);
  
  // Clean up all intervals and connections
  const cleanup = useCallback(() => {
    console.log('[AudioOutputControl] Running cleanup function');
    
    if (websocket.current) {
      console.log('[AudioOutputControl] Closing WebSocket in cleanup');
      websocket.current.close();
      websocket.current = null;
    }
    
    if (reconnectTimeout.current) {
      console.log('[AudioOutputControl] Clearing reconnect timeout');
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (pingInterval.current) {
      console.log('[AudioOutputControl] Clearing ping interval');
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  }, []);

  // Move setupWebSocket to useCallback BEFORE the useEffect that depends on it
  const setupWebSocket = useCallback(() => {
    if (!roomId) {
      console.log('[AudioOutputControl] No roomId provided, skipping WebSocket setup');
      return;
    }
    
    console.log(`[AudioOutputControl] Setting up WebSocket for room ${roomId} with language ${targetLanguage}`);
    
    // Close any existing connection
    if (websocket.current) {
      console.log('[AudioOutputControl] Closing existing WebSocket connection');
      websocket.current.close();
    }
    
    setConnectionStatus('connecting');
    
    // Use explicit backend URL instead of relative path
    const wsUrl = `ws://localhost:8000/ws/${roomId}?target_lang=${targetLanguage}`;
    
    console.log(`[AudioOutputControl] Connecting to WebSocket: ${wsUrl}`);
    
    try {
      // Create new WebSocket with fixed URL
      websocket.current = new WebSocket(wsUrl);
      console.log('[AudioOutputControl] WebSocket instance created');
      
      // Set timeout for initial connection
      const connectionTimeout = setTimeout(() => {
        console.warn('[AudioOutputControl] WebSocket connection timeout after 5 seconds');
        if (websocket.current && websocket.current.readyState !== WebSocket.OPEN) {
          console.warn('[AudioOutputControl] Closing timed-out connection');
          websocket.current.close();
          setConnectionStatus('disconnected');
          
          // Attempt reconnection
          reconnectTimeout.current = setTimeout(() => {
            console.log('[AudioOutputControl] Attempting to reconnect after timeout...');
            setupWebSocket();
          }, 2000);
        }
      }, 5000);
      
      websocket.current.onopen = () => {
        console.log('[AudioOutputControl] WebSocket connection established with readyState:', websocket.current?.readyState);
        clearTimeout(connectionTimeout);
        setConnectionStatus('connected');
        
        // Send an immediate ping to test the connection
        console.log('[AudioOutputControl] Sending initial ping');
        websocket.current?.send(JSON.stringify({ type: 'ping' }));
        
        startPingInterval();
      };
      
      websocket.current.onmessage = (event: MessageEvent) => {
        try {
          // For text messages
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            console.log(`[AudioOutputControl] Received message type: ${data.type}`, data);
            
            if (data.type === 'connection_established') {
              console.log('[AudioOutputControl] Connection officially established with server, user ID:', data.user_id);
              setConnectionStatus('connected');
            } else if (data.type === 'pong') {
              console.debug('[AudioOutputControl] Received pong from server');
            } else {
              console.log('[AudioOutputControl] Received other message type:', data.type);
            }
          } 
          // For binary data (audio)
          else if (event.data instanceof Blob) {
            console.log('[AudioOutputControl] Received binary data of size:', event.data.size);
          }
        } catch (error) {
          console.error('[AudioOutputControl] Error processing message:', error);
        }
      };
      
      websocket.current.onclose = (event) => {
        console.warn(`[AudioOutputControl] WebSocket closed with code: ${event.code}, reason: ${event.reason}, wasClean: ${event.wasClean}`);
        clearTimeout(connectionTimeout);
        setConnectionStatus('disconnected');
        
        if (!event.wasClean) {
          console.warn('[AudioOutputControl] Connection closed abnormally, attempting to reconnect...');
          reconnectTimeout.current = setTimeout(() => {
            console.log('[AudioOutputControl] Reconnecting after abnormal closure...');
            setupWebSocket();
          }, 3000);
        }
      };
      
      websocket.current.onerror = (error) => {
        console.error('[AudioOutputControl] WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
      
      return () => {
        console.log('[AudioOutputControl] Cleaning up WebSocket in setup function');
        clearTimeout(connectionTimeout);
        if (websocket.current) {
          websocket.current.close();
        }
      };
    } catch (error) {
      console.error('[AudioOutputControl] Error creating WebSocket:', error);
      setConnectionStatus('disconnected');
    }
  }, [roomId, targetLanguage, startPingInterval]);

  // Only set up WebSocket if roomId is provided
  useEffect(() => {
    console.log(`[AudioOutputControl] useEffect triggered with roomId: ${roomId}, targetLanguage: ${targetLanguage}`);
    
    if (roomId) {
      console.log('[AudioOutputControl] roomId available, setting up WebSocket');
      setupWebSocket();
    } else {
      console.log('[AudioOutputControl] No roomId, running cleanup');
      cleanup();
    }
    
    return () => {
      console.log('[AudioOutputControl] Component unmounting, running cleanup');
      cleanup();
    };
  }, [roomId, targetLanguage, cleanup, setupWebSocket]);

  return (
    <div className="flex items-center justify-between">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>
      
      <div className="flex items-center gap-2">
        <Switch
          id="audio-output"
          checked={!isMuted}
          onCheckedChange={() => onToggleMute()}
        />
        <Label htmlFor="audio-output">
          {isMuted ? "Sound off" : "Sound on"}
        </Label>
      </div>
      
      {roomId && (
        <div className="text-xs text-muted-foreground ml-2">
          Status: {connectionStatus === 'connected' ? 
            <span className="text-green-500">Connected</span> : 
            connectionStatus === 'connecting' ? 
              <span className="text-amber-500">Connecting...</span> : 
              <span className="text-red-500">Disconnected</span>
          }
        </div>
      )}
    </div>
  );
};

export default AudioOutputControl; 