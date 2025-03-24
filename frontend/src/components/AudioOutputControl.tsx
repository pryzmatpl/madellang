import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AudioOutputProps {
  isMuted: boolean;
  onToggleMute: () => void;
}

const AudioOutputControl: React.FC<AudioOutputProps> = ({
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="flex items-center justify-between">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>
      
      <div className="flex items-center gap-2">
        <Switch
          id="audio-output"
          checked={!isMuted}
          onCheckedChange={() => onToggleMute()}
        />
        <Label htmlFor="audio-output">
          {isMuted ? "Sound off" : "Sound on"}
        </Label>
      </div>
    </div>
  );
};

export default AudioOutputControl; 