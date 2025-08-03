import { useState, useRef, useCallback, useEffect } from 'react';
import * as React from 'react';

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

  const isMountedRef = useRef(true);

  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reconnectingRef = useRef(false);

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
    if (reconnectingRef.current) {
      console.log('[useRoomConnection] Reconnection already in progress');
      return null;
    }
    console.log('[useRoomConnection] Connecting to room, provided ID:', roomId);
    
    try {
      reconnectingRef.current = true;

      // Clean up any existing connections
      if (socketRef.current) {
        console.log('[useRoomConnection] Closing existing WebSocket');
        socketRef.current.close();
        socketRef.current = null;
      }


      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (!isMountedRef.current) return null; // ✅

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

      if (!isMountedRef.current) return null;

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
        reconnectingRef.current = false;

        if (!isMountedRef.current) return;
        setRoomState(prev => ({ ...prev, status: 'disconnected' }));
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }


        
        // Attempt to reconnect if closure wasn't clean
        if (!event.wasClean && isMountedRef.current && !reconnectingRef.current) {
          console.log('[useRoomConnection] Connection closed abnormally, will attempt to reconnect');

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !reconnectingRef.current) { // ✅ Double-check before reconnecting
              console.log('[useRoomConnection] Attempting to reconnect...');
              connectToRoom(roomState.currentRoom || undefined); // ✅ Use current room from state
            }
          }, 3000);
        }

      };
      
      socket.onerror = (error) => {
        console.error('[useRoomConnection] WebSocket error:', error);
        reconnectingRef.current = false;
        if (!isMountedRef.current) return;
      };
      
      // Send a connection check message after WebSocket connects
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'ping' }));
        console.log('[useRoomConnection] Sent initial ping on connection');
      });
      
      socket.onmessage = async (event) => {
        if (!isMountedRef.current) return;
        try {
          // Handle text messages (JSON)
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data) as WebSocketMessage;
            console.log(`[useRoomConnection] Received message: ${message.type}`);
            
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
            }
          }
          // Handle binary audio data
          else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            const size = event.data instanceof Blob ? event.data.size : event.data.byteLength;
            console.log(`[useRoomConnection] Received binary data: ${size} bytes`);

            console.log(event.data)

            if (onTranslatedAudio) {
              // Audio data is already in WAV format due to backend conversion
              const audioBlob = new Blob(
                [event.data],
                { type: 'audio/wav' }
              );
              onTranslatedAudio(audioBlob);
            }
          }
        } catch (error) {
          console.error('[useRoomConnection] Error processing message:', error);
        }
      };
      
      return currentRoomId || null;
    } catch (error) {
      console.error('[useRoomConnection] Error connecting to room:', error);
      reconnectingRef.current = false; // ✅ Clear rec
      if (!isMountedRef.current) return null;
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
      console.log('[useRoomConnection] Starting microphone');
      const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: false, // Disable to reduce artifacts
            echoCancellation: false,
            noiseSuppression: false,
            channelCount: 1, // Force mono to avoid stereo issues
            sampleRate: 44100, // Standard sample rate
          },
      });
      console.log("[useRoomConnection] Microphone stream settings:", stream.getAudioTracks()[0].getSettings());
      setAudioStream(stream);
      
      // Configure audio context and processor
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Process audio data and send over WebSocket
      processor.onaudioprocess = (e) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          // Get audio data from the buffer
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          
          // Send as binary data
          console.log(`[useRoomConnection] Sending ${pcmData.byteLength} bytes of audio`);
          socketRef.current.send(pcmData.buffer);
        }
      };
      
      // Store references for cleanup
      audioProcessorRef.current = processor;
      audioContextRef.current = audioContext;
      
      setRoomState(prev => ({
        ...prev,
        status: 'recording'
      }));
      
      return true;
    } catch (error) {
      console.error('[useRoomConnection] Error accessing microphone:', error);
      return false;
    }
  }, []);
  
  // Get a shareable URL for the current room
  const getRoomConnectionUrl = useCallback(() => {
    console.log('[useRoomConnection] Getting room URL for:', roomState.currentRoom);
    if (!roomState.currentRoom) return null;
    
    // Create a full URL with the proper base and query parameter
    const url = new URL(window.location.origin);
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
    isMountedRef.current = true;

    return () => {
      console.log('[useRoomConnection] Hook unmounting, cleaning up');

      isMountedRef.current = false;

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'close' }));
        socketRef.current.close(1000, 'Component unmounted');
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
  }, [audioStream, socketRef]);
  
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

// Helper function to create a WAV blob from PCM data
function createWavFromPcm(pcmBuffer: ArrayBuffer): Blob {
  // Create WAV header
  const pcmData = new Int16Array(pcmBuffer);
  const numChannels = 1;
  const sampleRate = 16000;
  const bitsPerSample = 16;
  
  // Calculate file size
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length * (bitsPerSample / 8);
  const headerSize = 44;
  const wavSize = headerSize + dataSize;
  
  console.log(`Creating WAV: channels=${numChannels}, sampleRate=${sampleRate}, bits=${bitsPerSample}, dataSize=${dataSize}`);
  
  // Create buffer for WAV file
  const wavBuffer = new ArrayBuffer(wavSize);
  const view = new DataView(wavBuffer);
  
  // Write WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // Subchunk size
  view.setUint16(20, 1, true);            // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);  // Channels
  view.setUint32(24, sampleRate, true);   // Sample rate
  view.setUint32(28, byteRate, true);     // Byte rate
  view.setUint16(32, blockAlign, true);   // Block align
  view.setUint16(34, bitsPerSample, true);// Bits per sample
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);     // Subchunk size
  
  // Write PCM data
  const pcmOffset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(pcmOffset + i * 2, pcmData[i], true);
  }
  
  // Return as Blob
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// Helper to write strings to DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
