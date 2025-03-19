import React, { useRef, useEffect, useState } from 'react';

interface AudioPlayerProps {
  audioBlob: Blob | null;
  autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBlob, autoPlay = true }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    // Clean up previous URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    // Create new URL for new blob
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Auto-play if enabled
      if (autoPlay && audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error('Failed to auto-play audio:', err);
        });
      }
    } else {
      setAudioUrl(null);
    }
    
    // Clean up on unmount
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioBlob, autoPlay]);

  return (
    <div className="audio-player">
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          controls={!autoPlay}
          style={autoPlay ? { display: 'none' } : undefined}
        />
      )}
    </div>
  );
};

export default AudioPlayer; 