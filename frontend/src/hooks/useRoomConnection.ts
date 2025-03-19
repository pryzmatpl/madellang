import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// In a real application, this would be an environment variable
const SERVER_URL = 'http://localhost:8000'; 

interface RoomState {
  isConnected: boolean;
  isRecording: boolean;
  currentRoom: string | null;
  error: string | null;
}

interface RoomConnectionOptions {
  targetLanguage: string;
  onTranslatedAudio?: (audioBlob: Blob) => void;
}

export function useRoomConnection({ 
  targetLanguage,
  onTranslatedAudio 
}: RoomConnectionOptions) {
  const [roomState, setRoomState] = useState<RoomState>({
    isConnected: false,
    isRecording: false,
    currentRoom: null,
    error: null
  });
  
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Connect to a specific room
  const connectToRoom = useCallback((roomId?: string) => {
    const room = roomId || uuidv4();
    
    try {
      socketRef.current = io(SERVER_URL, {
        query: { room },
        transports: ['websocket']
      });
      
      socketRef.current.on('connect', () => {
        setRoomState(prev => ({
          ...prev,
          isConnected: true,
          currentRoom: room,
          error: null
        }));
      });
      
      socketRef.current.on('disconnect', () => {
        setRoomState(prev => ({
          ...prev,
          isConnected: false
        }));
      });
      
      socketRef.current.on('translated_audio', (data: { audio: Blob }) => {
        if (onTranslatedAudio && data.audio) {
          onTranslatedAudio(data.audio);
        }
      });
      
      socketRef.current.on('error', (error: string) => {
        setRoomState(prev => ({
          ...prev,
          error
        }));
      });
      
      return room;
    } catch (error) {
      setRoomState(prev => ({
        ...prev,
        error: 'Failed to connect to server'
      }));
      return null;
    }
  }, [onTranslatedAudio]);
  
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
      error: null
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
        isRecording: true
      }));
      
    } catch (error) {
      setRoomState(prev => ({
        ...prev,
        error: 'Failed to access microphone'
      }));
    }
  }, [roomState.currentRoom, targetLanguage]);
  
  // Stop recording
  const stopMicrophone = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
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
  
  // Get URL for sharing
  const getRoomUrl = useCallback(() => {
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
    getRoomUrl,
    audioStream
  };
}
