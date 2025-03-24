import { useState, useRef, useEffect } from 'react';

interface AudioPlaybackOptions {
  /**
   * Whether to automatically play incoming audio
   */
  autoPlay?: boolean;
}

export function useAudioPlayback({
  autoPlay = true
}: AudioPlaybackOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);

  // Play a single audio blob
  const playAudioBlob = async (blob: Blob) => {
    try {
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Decode the audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Create source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Play the audio
      setIsPlaying(true);
      source.start(0);
      
      // Set up onended event
      source.onended = () => {
        setIsPlaying(false);
        processQueue();
      };
      
      return true;
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
      return false;
    }
  };
  
  // Process the audio queue
  const processQueue = async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    const nextAudio = audioQueueRef.current.shift();
    
    if (nextAudio) {
      await playAudioBlob(nextAudio);
    }
    
    isProcessingRef.current = false;
  };
  
  // Add audio to the queue
  const enqueueAudio = (audioBlob: Blob) => {
    audioQueueRef.current.push(audioBlob);
    
    if (autoPlay && !isPlaying && !isProcessingRef.current) {
      processQueue();
    }
    
    return audioQueueRef.current.length;
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  return {
    isPlaying,
    playAudio: playAudioBlob,
    enqueueAudio,
    clearQueue: () => {
      audioQueueRef.current = [];
    }
  };
} 