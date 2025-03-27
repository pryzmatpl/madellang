import { useState, useRef, useCallback, useEffect } from 'react';

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
  status: string;
  participants: string[];
  currentRoom: string | null;
  error: string | null;
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
    status: 'disconnected',
    participants: [],
    currentRoom: null,
    error: null,
  });
  
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connection State logging for debugging
  useEffect(() => {
    console.log('[useRoomConnection] Room state changed:', roomState);
  }, [roomState]);
  
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
      status: 'disconnected'
    }));
  }, [audioStream]);
  
  // Connect to a room
  const connectToRoom = useCallback(async (roomId?: string): Promise<string | null> => {
    console.log('[useRoomConnection] Connecting to room, provided ID:', roomId);
    
    try {
      // Clean up any existing connections
      if (socketRef.current) {
        console.log('[useRoomConnection] Closing existing WebSocket');
        socketRef.current.close();
        socketRef.current = null;
      }
      
      setRoomState(prev => ({ ...prev, status: 'connecting' }));
      
      // If roomId is provided, join that room; otherwise create a new room
      let currentRoomId = roomId;
      if (!currentRoomId) {
        console.log('[useRoomConnection] No room ID provided, creating new room');
        const response = await fetch('http://localhost:8000/create-room');
        if (!response.ok) {
          throw new Error('Failed to create room');
        }
        const data = await response.json();
        currentRoomId = data.room_id;
        console.log('[useRoomConnection] Created new room:', currentRoomId);
      }
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:8000/ws/${currentRoomId}?target_lang=${targetLanguage}`;
      console.log('[useRoomConnection] Connecting to WebSocket:', wsUrl);
      
      // Create new WebSocket
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('[useRoomConnection] WebSocket connection opened');
        setRoomState(prev => ({ 
          ...prev, 
          status: 'connected', 
          currentRoom: currentRoomId || null
        }));
        
        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            console.log('[useRoomConnection] Sending ping');
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };
      
      socket.onclose = (event) => {
        console.warn(`[useRoomConnection] WebSocket closed with code: ${event.code}, reason: ${event.reason}, wasClean: ${event.wasClean}`);
        setRoomState(prev => ({ ...prev, status: 'disconnected' }));
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt to reconnect if closure wasn't clean
        if (!event.wasClean) {
          console.log('[useRoomConnection] Connection closed abnormally, will attempt to reconnect');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[useRoomConnection] Attempting to reconnect...');
            connectToRoom(currentRoomId);
          }, 3000);
        }
      };
      
      socket.onerror = (error) => {
        console.error('[useRoomConnection] WebSocket error:', error);
      };
      
      // Send a connection check message after WebSocket connects
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'ping' }));
        console.log('[useRoomConnection] Sent initial ping on connection');
      });
      
      socket.onmessage = (event) => {
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
      
      return currentRoomId || null;
    } catch (error) {
      console.error('[useRoomConnection] Error connecting to room:', error);
      setRoomState(prev => ({
        ...prev,
        status: 'disconnected',
        error: (error as Error).message
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
    
    if (mediaRecorderRef.current && roomState.status === 'recording') {
      stopMicrophone();
    }
    
    setRoomState({
      status: 'disconnected',
      participants: [],
      currentRoom: null,
      error: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState.status]);
  
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
        status: 'recording',
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
    console.log('[useRoomConnection] Getting room URL for:', roomState.currentRoom);
    if (!roomState.currentRoom) return null;
    
    const url = new URL('http://localhost:8000');
    url.search = `?room=${roomState.currentRoom}`;
    return url.toString();
  }, [roomState.currentRoom]);
  
  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[useRoomConnection] Page unloading, cleaning up connections');
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [audioStream]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[useRoomConnection] Hook unmounting, cleaning up');
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
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
