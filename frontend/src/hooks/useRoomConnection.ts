import { useState, useRef, useCallback, useEffect } from 'react';
import { BACKEND_URL } from '@/config';

// Define message types for WebSocket
interface TranslatedAudioMessage {
  type: 'translated_audio';
  audio: ArrayBuffer;
}

interface RoomJoinedMessage {
  type: 'connection_established';
  room_id: string;
  user_id: string;
}

interface ParticipantJoinedMessage {
  type: 'user_joined';
  user_id: string;
}

interface ParticipantLeftMessage {
  type: 'user_left';
  user_id: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type WebSocketMessage = 
  | TranslatedAudioMessage
  | RoomJoinedMessage
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | ErrorMessage;

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
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Connect to a room
  const connectToRoom = useCallback(async (roomId?: string) => {
    try {
      // Create a new WebSocket connection if one doesn't exist
      if (!socketRef.current) {
        const newRoomId = roomId || `room-${Math.random().toString(36).substring(2, 9)}`;
        const wsUrl = `${BACKEND_URL.replace('http://', 'ws://')}/ws/${newRoomId}?target_lang=${targetLanguage}`;
        
        socketRef.current = new WebSocket(wsUrl);
        
        // Set up socket event handlers
        socketRef.current.onopen = () => {
          setRoomState(prev => ({
            ...prev,
            isConnected: true,
            error: null,
            currentRoom: newRoomId,
          }));
        };
        
        socketRef.current.onclose = () => {
          setRoomState(prev => ({
            ...prev,
            isConnected: false
          }));
        };
        
        socketRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setRoomState(prev => ({
            ...prev,
            error: 'WebSocket connection error'
          }));
        };
        
        socketRef.current.onmessage = (event) => {
          // Handle binary data (audio)
          if (event.data instanceof Blob) {
            onTranslatedAudio(event.data);
            return;
          }
          
          // Handle JSON messages
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            
            switch (message.type) {
              case 'connection_established':
                setRoomState(prev => ({
                  ...prev,
                  currentRoom: message.room_id,
                }));
                break;
              
              case 'user_joined':
                setRoomState(prev => ({
                  ...prev,
                  participants: [...(prev.participants || []), message.user_id]
                }));
                break;
              
              case 'user_left':
                setRoomState(prev => ({
                  ...prev,
                  participants: (prev.participants || []).filter(id => id !== message.user_id)
                }));
                break;
              
              case 'error':
                setRoomState(prev => ({
                  ...prev,
                  error: message.message
                }));
                break;
                
              case 'translated_audio':
                // Handle translated audio if it comes as JSON
                // This should be binary data but adding a fallback
                if (message.audio) {
                  const audioBlob = new Blob([message.audio], { type: 'audio/webm' });
                  onTranslatedAudio(audioBlob);
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        return newRoomId;
      } else {
        return roomState.currentRoom;
      }
    } catch (error) {
      console.error('Error connecting to room:', error);
      setRoomState(prev => ({
        ...prev,
        error: 'Failed to connect to room'
      }));
      return null;
    }
  }, [targetLanguage, onTranslatedAudio, roomState.currentRoom]);
  
  // Disconnect from room
  const disconnectFromRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
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
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(event.data);
          }
        }
      };
      
      mediaRecorder.start(1000); // Send data every 1000ms
      
      setRoomState(prev => ({
        ...prev,
        isRecording: true,
        error: null
      }));
      
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setRoomState(prev => ({
        ...prev,
        error: "Could not access microphone. Please check permissions."
      }));
      return false;
    }
  }, [roomState.currentRoom]);
  
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
        socketRef.current.close();
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
