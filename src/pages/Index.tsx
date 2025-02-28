
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import LanguageSelector from "@/components/LanguageSelector";
import AudioVisualizer from "@/components/AudioVisualizer";
import AudioStatus from "@/components/AudioStatus";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { cn } from "@/lib/utils";

const Index = () => {
  const { toast } = useToast();
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Get room ID from URL if it exists
  const searchParams = new URLSearchParams(window.location.search);
  const roomIdFromUrl = searchParams.get('room');
  
  const {
    roomState,
    connectToRoom,
    disconnectFromRoom,
    startMicrophone,
    stopMicrophone,
    getRoomUrl,
    audioStream
  } = useRoomConnection({
    targetLanguage,
    onTranslatedAudio: (audioBlob) => {
      // Handle translated audio
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000); // Simulate speech ending
    }
  });
  
  // Connect to room from URL or create a new one
  useEffect(() => {
    if (roomIdFromUrl) {
      connectToRoom(roomIdFromUrl);
      toast({
        title: "Joined Translation Room",
        description: `You've joined room ${roomIdFromUrl.substring(0, 8)}...`,
      });
    }
  }, [roomIdFromUrl, connectToRoom, toast]);
  
  const handleStartStop = async () => {
    if (isActive) {
      stopMicrophone();
      setIsActive(false);
    } else {
      // If not connected to a room yet, create one
      if (!roomState.isConnected) {
        const roomId = connectToRoom();
        toast({
          title: "Room Created",
          description: `Your translation room is ready. ID: ${roomId.substring(0, 8)}...`,
        });
      }
      
      const stream = await startMicrophone();
      if (stream) {
        setIsActive(true);
      } else {
        toast({
          variant: "destructive",
          title: "Microphone Error",
          description: "Could not access microphone. Please check permissions.",
        });
      }
    }
  };
  
  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight animate-fade-in">
              Voice Translator
            </h1>
            <p className="text-muted-foreground animate-fade-in">
              Real-time voice translation with minimal latency
            </p>
          </div>
          
          <Card className="overflow-hidden border-0 shadow-lg animate-scale-in">
            <CardContent className="p-6 space-y-6">
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
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleStartStop} 
                  className={cn(
                    "flex-1 custom-transition",
                    isActive ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isActive ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" /> Stop
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" /> Start
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleQRCode}
                  disabled={!roomState.isConnected}
                  className={cn(
                    "custom-transition",
                    showQRCode && "bg-secondary"
                  )}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              
              {showQRCode && roomState.isConnected && (
                <div className="pt-4 border-t animate-fade-in">
                  <QRCodeDisplay 
                    roomId={roomState.roomId} 
                    url={getRoomUrl()} 
                  />
                </div>
              )}
              
              {roomState.participants.length > 1 && (
                <div className="text-sm text-center text-muted-foreground pt-2">
                  {roomState.participants.length} participants in room
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="text-center text-xs text-muted-foreground animate-fade-in">
            <p>Ultra low latency voice translation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
