
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import LanguageSelector from "@/components/LanguageSelector";
import AudioVisualizer from "@/components/AudioVisualizer";
import AudioStatus from "@/components/AudioStatus";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LanguageTutorProps {
  // Add props if needed
}

const proficiencyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'fluent', label: 'Fluent' },
];

const LanguageTutor = () => {
  const { toast } = useToast();
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [proficiencyLevel, setProficiencyLevel] = useState("beginner");
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const handleStartConversation = async () => {
    if (isActive) {
      // Stop the conversation
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      setIsActive(false);
      toast({
        title: "Conversation Ended",
        description: "Your language tutoring session has ended.",
      });
    } else {
      // Start the conversation
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        setIsActive(true);
        toast({
          title: "Conversation Started",
          description: `Your ${proficiencyLevel} level ${getLanguageName(targetLanguage)} tutoring session has begun.`,
        });
        
        // Simulate AI tutor speaking
        setTimeout(() => {
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000);
        }, 1500);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Microphone Error",
          description: "Could not access microphone. Please check permissions.",
        });
      }
    }
  };
  
  const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ru': 'Russian',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'hi': 'Hindi',
    };
    
    return languages[code] || code;
  };
  
  return (
    <Card className="overflow-hidden border-0 shadow-lg animate-scale-in">
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">AI Language Tutor</h2>
          <p className="text-sm text-muted-foreground">
            Practice conversations with an AI tutor
          </p>
        </div>
        
        <AudioStatus 
          isListening={isActive} 
          isSpeaking={isSpeaking} 
        />
        
        <AudioVisualizer 
          isActive={isActive}
          audioStream={audioStream}
        />
        
        <LanguageSelector
          selectedLanguage={targetLanguage}
          onLanguageChange={setTargetLanguage}
          disabled={isActive}
        />
        
        <div className="space-y-2">
          <label htmlFor="proficiency-select" className="text-sm font-medium">
            Your Proficiency Level
          </label>
          <Select
            disabled={isActive}
            value={proficiencyLevel}
            onValueChange={setProficiencyLevel}
          >
            <SelectTrigger className="w-full" id="proficiency-select">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {proficiencyLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleStartConversation} 
          className={cn(
            "w-full custom-transition",
            isActive ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
          )}
        >
          {isActive ? (
            <>
              <MicOff className="mr-2 h-4 w-4" /> End Conversation
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" /> Start Conversation
            </>
          )}
        </Button>
        
        {isActive && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={16} className={cn("text-blue-500", isSpeaking && "animate-pulse")} />
              <span className="font-medium">AI Tutor:</span>
            </div>
            <p className="text-muted-foreground">
              ¡Hola! ¿Cómo estás hoy? Vamos a practicar un poco de español.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LanguageTutor;