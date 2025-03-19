import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send } from "lucide-react";
import LanguageSelector from "./LanguageSelector";

const LanguageTutor: React.FC = () => {
  const [userText, setUserText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSend = async () => {
    if (!userText.trim()) return;
    
    setIsLoading(true);
    
    // Mock API call for language tutoring feedback
    setTimeout(() => {
      setFeedback(`Here's the correct pronunciation in ${targetLanguage === 'es' ? 'Spanish' : 'other language'}: 
      
"${userText}"

Your pronunciation was good! Pay attention to the stress on the second syllable.`);
      setIsLoading(false);
    }, 1500);
  };
  
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, this would start/stop speech recognition
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Language Tutor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Language</label>
          <LanguageSelector 
            value={targetLanguage}
            onChange={setTargetLanguage}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Practice Phrase or Sentence</label>
          <div className="flex gap-2">
            <Textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Type or speak a phrase to practice..."
              className="min-h-24"
            />
          </div>
          
          <div className="flex justify-between mt-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleRecording}
              className={isRecording ? "bg-red-100" : ""}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button onClick={handleSend} disabled={!userText.trim() || isLoading}>
              {isLoading ? "Processing..." : "Get Feedback"}
              {!isLoading && <Send className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {feedback && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Feedback:</h3>
            <div className="whitespace-pre-line text-sm">{feedback}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LanguageTutor;