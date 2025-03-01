import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../utils/socket';
import { audioProcessor } from '../utils/audio';
import { createRoom, getRoomFromUrl, updateUrlWithRoom } from '../utils/room';
import { TranslationState, AudioData, RoomData } from '../types';

export const useTranslation = () => {
  const [state, setState] = useState<TranslationState>({
    isConnected: false,
    isTranslating: false,
    selectedLanguage: 'en',
    roomData: null,
    error: null,
  });

  // Initialize room on mount
  useEffect(() => {
    const initializeRoom = () => {
      try {
        // Check if we're joining an existing room
        const roomIdFromUrl = getRoomFromUrl();
        
        if (roomIdFromUrl) {
          // Join existing room
          const roomUrl = `${window.location.origin}?room=${roomIdFromUrl}`;
          const roomData: RoomData = { id: roomIdFromUrl, url: roomUrl };
          
          setState(prev => ({ ...prev, roomData }));
          connectToRoom(roomData.id);
        } else {
          // Create new room
          const newRoom = createRoom();
          setState(prev => ({ ...prev, roomData: newRoom }));
          updateUrlWithRoom(newRoom.id);
          connectToRoom(newRoom.id);
        }
      } catch (error) {
        console.error('Error initializing room:', error);
        setState(prev => ({ ...prev, error: 'Failed to initialize room' }));
      }
    };

    initializeRoom();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Set up audio processor
  useEffect(() => {
    audioProcessor.onAudioData((audioData: ArrayBuffer) => {
      if (state.isTranslating && state.roomData) {
        const data: AudioData = {
          audio: audioData,
          language: state.selectedLanguage,
          roomId: state.roomData.id,
        };
        socketService.sendAudio(data);
      }
    });
  }, [state.isTranslating, state.selectedLanguage, state.roomData]);

  // Set up socket listeners
  useEffect(() => {
    socketService.onConnectionChange((connected) => {
      setState(prev => ({ ...prev, isConnected: connected }));
    });

    socketService.onTranslatedAudio((data) => {
      audioProcessor.playAudio(data.audio);
    });
  }, []);

  const connectToRoom = (roomId: string) => {
    socketService.connect(roomId);
  };

  const toggleTranslation = useCallback(async () => {
    try {
      if (state.isTranslating) {
        audioProcessor.stopRecording();
        setState(prev => ({ ...prev, isTranslating: false }));
      } else {
        await audioProcessor.startRecording();
        setState(prev => ({ ...prev, isTranslating: true }));
      }
    } catch (error) {
      console.error('Error toggling translation:', error);
      setState(prev => ({ ...prev, error: 'Failed to access microphone' }));
    }
  }, [state.isTranslating]);

  const setLanguage = useCallback((language: string) => {
    setState(prev => ({ ...prev, selectedLanguage }));
  }, []);

  return {
    ...state,
    toggleTranslation,
    setLanguage,
  };
};