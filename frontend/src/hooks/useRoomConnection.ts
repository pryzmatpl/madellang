import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface RoomState {
  isConnected: boolean;
  isRecording: boolean;
  currentRoom: string | null;
  error: string | null;
  participants?: string[]; // Added as optional
}

interface RoomConnectionOptions {
  targetLanguage: string;
  onTranslatedAudio: (audioBlob: Blob) => void;
}

export function useRoomConnection({ 
  targetLanguage,
  onTranslatedAudio 
}: RoomConnectionOptions) {
  // State
  const [roomState, setRoomState] = useState<RoomState>({
    isConnected: false,
    isRecording: false,
    currentRoom: null,
    error: null,
    participants: [] // Initialize with an empty array
  });
  
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Connect to a room
  const connectToRoom = useCallback(async (roomId?: string) => {
    try {
      // Create a new socket connection if one doesn't exist
      if (!socketRef.current) {
        socketRef.current = io('http://localhost:8000');
        
        // Set up socket event handlers
        socketRef.current.on('connect', () => {
          setRoomState(prev => ({
            ...prev,
            isConnected: true,
            error: null
          }));
        });
        
        socketRef.current.on('disconnect', () => {
          setRoomState(prev => ({
            ...prev,
            isConnected: false
          }));
        });
        
        socketRef.current.on('translated_audio', (data) => {
          if (data && data.audio) {
            const audioBlob = new Blob([data.audio], { type: 'audio/webm' });
            onTranslatedAudio(audioBlob);
          }
        });
        
        socketRef.current.on('room_joined', (data) => {
          setRoomState(prev => ({
            ...prev,
            currentRoom: data.roomId,
            participants: data.participants || []
          }));
        });
        
        socketRef.current.on('participant_joined', (data) => {
          setRoomState(prev => ({
            ...prev,
            participants: [...(prev.participants || []), data.participantId]
          }));
        });
        
        socketRef.current.on('participant_left', (data) => {
          setRoomState(prev => ({
            ...prev,
            participants: (prev.participants || []).filter(id => id !== data.participantId)
          }));
        });
        
        socketRef.current.on('error', (error) => {
          setRoomState(prev => ({
            ...prev,
            error: error.message
          }));
        });
      }
      
      // Join or create a room
      const newRoomId = roomId || `room-${Math.random().toString(36).substring(2, 9)}`;
      socketRef.current.emit('join_room', {
        roomId: newRoomId,
        language: targetLanguage
      });
      
      setRoomState(prev => ({
        ...prev,
        currentRoom: newRoomId,
        error: null
      }));
      
      return newRoomId;
    } catch (error) {
      console.error('Error connecting to room:', error);
      setRoomState(prev => ({
        ...prev,
        error: 'Failed to connect to room'
      }));
      return null;
    }
  }, [targetLanguage, onTranslatedAudio]);
  
  // Disconnect from room
  const disconnectFromRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (mediaRecorderRef.current && roomState.isRecording) {
      stopMicrophone();
    }
    
    setRoomState({
      isConnected: false,
      isRecording: false,
      currentRoom: null,
      error: null,
      participants: []
    });
  }, [roomState.isRecording]);
  
  // Start recording from microphone
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send the audio chunk to the server
          if (socketRef.current && socketRef.current.connected) {
            const audioBlob = new Blob([event.data], { type: 'audio/webm' });
            socketRef.current.emit('audio_data', {
              audio: audioBlob,
              language: targetLanguage,
              room: roomState.currentRoom
            });
          }
        }
      };
      
      mediaRecorder.start(1000); // Send data every 1000ms
      
      setRoomState(prev => ({
        ...prev,
        isRecording: true,
        error: null
      }));
      
      // Simulate receiving translated audio after a short delay
      setTimeout(() => {
        // Create a mock audio blob
        const mockAudioBlob = new Blob([], { type: 'audio/mp3' });
        onTranslatedAudio(mockAudioBlob);
      }, 3000);
      
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setRoomState(prev => ({
        ...prev,
        error: "Could not access microphone. Please check permissions."
      }));
      return false;
    }
  }, [roomState.currentRoom, targetLanguage, onTranslatedAudio]);
  
  // Stop recording from microphone
  const stopMicrophone = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    setRoomState(prev => ({
      ...prev,
      isRecording: false
    }));
  }, [audioStream]);
  
  // Get room URL for sharing
  const getRoomConnectionUrl = useCallback(() => {
    if (!roomState.currentRoom) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomState.currentRoom);
    return url.toString();
  }, [roomState.currentRoom]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);
  
  return {
    roomState,
    connectToRoom,
    disconnectFromRoom,
    startMicrophone,
    stopMicrophone,
    getRoomUrl: getRoomConnectionUrl,
    audioStream
  };
}
