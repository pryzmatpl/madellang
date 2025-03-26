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
    if (websocket.current) {
      websocket.current.close();
      websocket.current = null;
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  }, []);

  // Move setupWebSocket to useCallback BEFORE the useEffect that depends on it
  const setupWebSocket = useCallback(() => {
    if (!roomId) return;
    
    // Close any existing connection
    if (websocket.current) {
      websocket.current.close();
    }
    
    setConnectionStatus('connecting');
    
    // Determine protocol based on current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}?target_lang=${targetLanguage}`;
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    try {
      // Create new WebSocket with additional error handling
      websocket.current = new WebSocket(wsUrl);
      
      // Set timeout for initial connection
      const connectionTimeout = setTimeout(() => {
        console.error('WebSocket connection timeout');
        if (websocket.current && websocket.current.readyState !== WebSocket.OPEN) {
          websocket.current.close();
          setConnectionStatus('disconnected');
          
          // Attempt reconnection
          reconnectTimeout.current = setTimeout(() => {
            console.log('Attempting to reconnect after timeout...');
            setupWebSocket();
          }, 2000);
        }
      }, 5000);
      
      websocket.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        startPingInterval();
      };
      
      websocket.current.onmessage = (event: MessageEvent) => {
        try {
          // For text messages
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            console.log(`Received message type: ${data.type}`, data);
            
            if (data.type === 'connection_established') {
              console.log('Connection officially established with server, user ID:', data.user_id);
              // We can store the user ID if needed
              setConnectionStatus('connected');
            } else if (data.type === 'pong') {
              // Just log the pong at debug level
              console.debug('Received pong from server');
            } else {
              console.log('Received other message type:', data.type);
            }
          } 
          // For binary data (audio)
          else if (event.data instanceof Blob) {
            console.log('Received binary data of size:', event.data.size);
            // Process audio data here
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      websocket.current.onclose = (event: CloseEvent) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
        setConnectionStatus('disconnected');
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        // Don't reconnect on normal closure
        if (event.code !== 1000) {
          console.log('Scheduling reconnection...');
          reconnectTimeout.current = setTimeout(() => setupWebSocket(), 3000);
        }
      };
      
      websocket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionStatus('disconnected');
    }
  }, [roomId, targetLanguage, startPingInterval]);

  // Only set up WebSocket if roomId is provided
  useEffect(() => {
    if (roomId) {
      setupWebSocket();
    } else {
      cleanup();
    }
    
    return cleanup;
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