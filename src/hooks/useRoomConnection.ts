
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// In a real application, this would be an environment variable
const SERVER_URL = 'https://yourbackend.com'; // This is a placeholder

export interface RoomState {
  roomId: string;
  isConnected: boolean;
  isRoomCreator: boolean;
  error: string | null;
  participants: string[];
}

export interface UseRoomConnectionProps {
  targetLanguage: string;
  onTranslatedAudio?: (audioBlob: Blob) => void;
}

export const useRoomConnection = ({
  targetLanguage,
  onTranslatedAudio,
}: UseRoomConnectionProps) => {
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: '',
    isConnected: false,
    isRoomCreator: false,
    error: null,
    participants: [],
  });
  
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // For demo purposes, instead of connecting to a real server,
  // we'll simulate the connection with a timeout
  const connectToRoom = useCallback((roomId?: string) => {
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    const newRoomId = roomId || uuidv4();
    const isCreator = !roomId;
    
    // In a real implementation, this would connect to an actual WebSocket server
    setRoomState(prev => ({
      ...prev,
      roomId: newRoomId,
      isConnected: true,
      isRoomCreator: isCreator,
      error: null,
    }));
    
    // Simulate connection event
    setTimeout(() => {
      setRoomState(prev => ({
        ...prev,
        participants: isCreator ? [newRoomId] : [roomId as string, newRoomId],
      }));
    }, 500);
    
    // Return the room ID (useful for creating a new room)
    return newRoomId;
  }, []);
  
  const disconnectFromRoom = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setRoomState({
      roomId: '',
      isConnected: false,
      isRoomCreator: false,
      error: null,
      participants: [],
    });
  }, []);
  
  const startMicrophone = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API for audio streaming not supported');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // In a real implementation, we would send this audio stream to the server
      // For demo purposes, we'll just simulate receiving translated audio back
      
      return stream;
    } catch (error) {
      setRoomState(prev => ({
        ...prev,
        error: 'Could not access microphone. Please check permissions.',
      }));
      return null;
    }
  }, []);
  
  const stopMicrophone = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);
  
  // Generate a joining URL for the current room
  const getRoomUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?room=${roomState.roomId}`;
  }, [roomState.roomId]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectFromRoom();
    };
  }, [disconnectFromRoom]);
  
  return {
    roomState,
    connectToRoom,
    disconnectFromRoom,
    startMicrophone,
    stopMicrophone,
    getRoomUrl,
    audioStream: streamRef.current,
  };
};
