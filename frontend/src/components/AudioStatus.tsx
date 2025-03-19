import React from 'react';
import { Volume2, Volume, VolumeX } from 'lucide-react';

interface AudioStatusProps {
  isActive?: boolean;
  isSpeaking: boolean;
  isListening?: boolean;
}

const AudioStatus: React.FC<AudioStatusProps> = ({ 
  isActive = false, 
  isSpeaking, 
  isListening 
}) => {
  // Use isListening if provided, otherwise use isActive
  const listening = isListening !== undefined ? isListening : isActive;
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
      {listening && isSpeaking ? (
        <>
          <Volume2 className="h-4 w-4 text-green-500 animate-pulse" />
          <span>Translating audio...</span>
        </>
      ) : listening ? (
        <>
          <Volume className="h-4 w-4 text-blue-500" />
          <span>Waiting for speech...</span>
        </>
      ) : (
        <>
          <VolumeX className="h-4 w-4 text-gray-400" />
          <span>Microphone off</span>
        </>
      )}
    </div>
  );
};

export default AudioStatus;
