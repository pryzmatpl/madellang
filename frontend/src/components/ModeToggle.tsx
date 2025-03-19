import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, BookOpen } from "lucide-react";

interface ModeToggleProps {
  currentMode: 'translation' | 'tutor';
  onModeChange: (mode: 'translation' | 'tutor') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ currentMode, onModeChange }) => {
  return (
    <Tabs
      defaultValue={currentMode}
      onValueChange={(value) => onModeChange(value as 'translation' | 'tutor')}
      className="w-full"
    >
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="translation" className="flex items-center gap-2">
          <Mic className="h-4 w-4" />
          <span>Translation</span>
        </TabsTrigger>
        <TabsTrigger value="tutor" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>Language Tutor</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ModeToggle;