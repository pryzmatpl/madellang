
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioStatusProps {
  isSpeaking: boolean;
  isListening: boolean;
}

const AudioStatus = ({ isSpeaking, isListening }: AudioStatusProps) => {
  return (
    <div className="flex items-center justify-center space-x-6">
      <div className="flex flex-col items-center">
        <div 
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full",
            isListening 
              ? "bg-green-100 text-green-600 animate-pulse-opacity" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isListening ? <Mic size={22} /> : <MicOff size={22} />}
        </div>
        <span className="text-xs mt-1">Input</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div 
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full",
            isSpeaking 
              ? "bg-blue-100 text-blue-600 animate-pulse-opacity" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isSpeaking ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </div>
        <span className="text-xs mt-1">Output</span>
      </div>
    </div>
  );
};

export default AudioStatus;
