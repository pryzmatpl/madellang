import { useState, useRef, useCallback, useEffect } from 'react';
import { BACKEND_URL } from '@/config';

// Define message types for WebSocket
interface TranslatedAudioMessage {
  type: 'translated_audio';
  audio: ArrayBuffer;
}

interface ConnectionEstablishedMessage {
  type: 'connection_established';
  room_id: string;
  user_id: string;
}

interface UserJoinedMessage {
  type: 'user_joined';
  user_id: string;
}

interface UserLeftMessage {
  type: 'user_left';
  user_id: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

interface PongMessage {
  type: 'pong';
}

// Union type of all message types
type WebSocketMessage = 
  | TranslatedAudioMessage 
  | ConnectionEstablishedMessage 
  | UserJoinedMessage 
  | UserLeftMessage 
  | ErrorMessage
  | PongMessage;

interface RoomState {
  isConnected: boolean;
  isRecording: boolean;
  currentRoom: string | null;
  error: string | null;
  participants: string[];
}

interface RoomConnectionOptions {
  targetLanguage: string;
  onTranslatedAudio: (audio: Blob) => void;
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
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
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
  
  // Connect to a room
  const connectToRoom = useCallback(async (roomId?: string): Promise<string | null> => {
    try {
      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      // Create a new WebSocket connection
      const newRoomId = roomId || `room-${Math.random().toString(36).substring(2, 9)}`;
      
      // Try using explicit protocol and full URL format
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = BACKEND_URL.replace('http://', '').replace('https://', '');
      const wsUrl = `${wsProtocol}//${wsHost}/ws/${newRoomId}?target_lang=${targetLanguage}`;
      
      console.log(`Connecting to WebSocket at ${wsUrl} with protocol ${wsProtocol}`);
      
      // Create a new WebSocket with explicit timeout handling
      const setupConnection = () => {
        return new Promise<WebSocket>((resolve, reject) => {
          const socket = new WebSocket(wsUrl);
          
          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            console.error('WebSocket connection timeout');
            socket.close();
            reject(new Error('Connection timeout'));
          }, 5000);
          
          socket.onopen = () => {
            clearTimeout(connectionTimeout);
            console.log('WebSocket connection opened successfully');
            resolve(socket);
          };
          
          socket.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('WebSocket connection error:', error);
            reject(error);
          };
        });
      };

      // Add event handler for the first message
      const firstMessageHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connection_established') {
            console.log('Connection officially established with server');
            // Connection is now fully established
            socketRef.current?.removeEventListener('message', firstMessageHandler);
          }
        } catch (error) {
          console.error('Error processing first message:', error);
        }
      };

      socketRef.current = await setupConnection();
      socketRef.current.addEventListener('message', firstMessageHandler);
      
      socketRef.current.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code}, reason: ${event.reason}, clean: ${event.wasClean}`);
        setRoomState(prev => ({
          ...prev,
          isConnected: false
        }));
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt to reconnect after 2 seconds if not closed cleanly
        if (!event.wasClean && roomState.currentRoom) {
          console.log(`Scheduling reconnect to room ${roomState.currentRoom}`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log(`Attempting to reconnect to room ${roomState.currentRoom}`);
            // Fix the nullable type issue
            if (roomState.currentRoom) {
              connectToRoom(roomState.currentRoom);
            }
          }, 2000);
        }
      };
      
      socketRef.current.onmessage = (event) => {
        // Handle binary data (audio)
        if (event.data instanceof Blob) {
          console.log(`Received binary data: ${event.data.size} bytes`);
          onTranslatedAudio(event.data);
          return;
        }
        
        // Handle JSON messages
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log(`Received message: ${message.type}`);
          
          switch (message.type) {
            case 'connection_established':
              setRoomState(prev => ({
                ...prev,
                currentRoom: message.room_id,
              }));
              break;
            
            case 'pong':
              // No action needed, this just confirms the connection is alive
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
              if ('audio' in message) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // roomState.currentRoom is removed as it's not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Get a shareable URL for the current room
  const getRoomConnectionUrl = useCallback(() => {
    if (!roomState.currentRoom) return null;
    
    const url = new URL(window.location.href);
    url.search = `?room=${roomState.currentRoom}`;
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
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
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
