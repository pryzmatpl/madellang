
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModeToggleProps {
  currentMode: 'translation' | 'tutor';
  onModeChange: (mode: 'translation' | 'tutor') => void;
}

const ModeToggle = ({ currentMode, onModeChange }: ModeToggleProps) => {
  return (
    <div className="flex bg-muted rounded-lg p-1 w-full max-w-xs mx-auto mb-6">
      <Button
        variant="ghost"
        className={cn(
          "flex-1 rounded-md text-sm font-medium custom-transition",
          currentMode === 'translation' 
            ? "bg-background shadow-sm" 
            : "hover:bg-background/50"
        )}
        onClick={() => onModeChange('translation')}
      >
        Translation
      </Button>
      <Button
        variant="ghost"
        className={cn(
          "flex-1 rounded-md text-sm font-medium custom-transition",
          currentMode === 'tutor' 
            ? "bg-background shadow-sm" 
            : "hover:bg-background/50"
        )}
        onClick={() => onModeChange('tutor')}
      >
        Language Tutor
      </Button>
    </div>
  );
};

export default ModeToggle;