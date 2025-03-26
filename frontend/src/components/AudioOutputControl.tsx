import React, { useState, useRef, useEffect } from 'react';
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

  // Only set up WebSocket if roomId is provided
  useEffect(() => {
    if (roomId) {
      setupWebSocket();
    }
    
    // Cleanup function
    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [roomId, targetLanguage]);

  const setupWebSocket = () => {
    if (!roomId) return;
    
    // Close any existing connection
    if (websocket.current) {
      websocket.current.close();
    }
    
    setConnectionStatus('connecting');
    
    // Determine protocol (ws or wss) based on current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}?target_lang=${targetLanguage}`;
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    try {
      websocket.current = new WebSocket(wsUrl);
      
      websocket.current.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
      };
      
      websocket.current.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          // Handle messages based on their type
          if (data.type === 'connection_established') {
            console.log('Connection confirmed by server');
          } else if (data.type === 'translation') {
            // Handle translation data
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      websocket.current.onclose = (event: CloseEvent) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
        setConnectionStatus('disconnected');
        
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
  };

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