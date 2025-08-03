import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import LanguageSelector from "@/components/LanguageSelector";
import AudioVisualizer from "@/components/AudioVisualizer";
import AudioStatus from "@/components/AudioStatus";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { cn } from "@/lib/utils";
import ModeToggle from "@/components/ModeToggle";
import LanguageTutor from "@/components/LanguageTutor";
import { QRCodeSVG } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import AudioOutputControl from "@/components/AudioOutputControl";

const Index = () => {
  const { toast } = useToast();
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [currentMode, setCurrentMode] = useState<'translation' | 'tutor'>('translation');
  const { enqueueAudio } = useAudioPlayback();
  const [isMuted, setIsMuted] = useState(false);

  const buttonEcho = useRef<HTMLButtonElement>(null);
  const [echo, setIsEcho] = useState<boolean>(false);
  
  // Get room ID from URL if it exists
  const searchParams = new URLSearchParams(window.location.search);
  const roomIdFromUrl = searchParams.get('room');

  const onTranslatedAudio = useCallback ((audioBlob: Blob) =>
  {
      // 44 kHz sampling is minimum to go up the human ear scale
      const timeout = 23 / 1000; // Convert microseconds to milliseconds
      setTimeout(() => {
        setIsSpeaking(false);
      }, timeout);

      if (!isMuted) {
        enqueueAudio(audioBlob);
      }
  },[isMuted, enqueueAudio]);

  const {
    roomState,
    connectToRoom,
    startMicrophone,
    stopMicrophone,
    getRoomUrl,
    audioStream
  } = useRoomConnection({
    targetLanguage,
    onTranslatedAudio
  });

  // Connect to room from URL or create a new one
  useEffect(() => {
        if (roomIdFromUrl) {
          console.log('[Index] Connecting to room from URL:', roomIdFromUrl);
          connectToRoom(roomIdFromUrl);
          const roomIdDisplay = roomIdFromUrl.substring(0, 8) + '...';
          toast({
            title: "Joined Translation Room",
            description: `You've joined room ${roomIdDisplay}`,
          });
        }
  }, [roomIdFromUrl, connectToRoom, toast]);

  
  // Handle language change - using value directly
  const handleLanguageChange = (newLanguage: string) => {
    console.log("Language changed to:", newLanguage);
    setTargetLanguage(newLanguage);
    
    // Restart the session if active to apply the new language
    if (isActive) {
      stopMicrophone();
      toast({
        title: "Language Changed",
        description: `Switching to ${newLanguage}. Please restart recording.`,
      });
      setIsActive(false);
    }
  };
  
  const handleStartStop = async () => {
    if (isActive) {
      // Stop recording
      stopMicrophone();
      setIsActive(false);
    } else {
      // Start recording
      try {
        // Connect to a room if not already connected
        if (roomState.status !== 'connected') {
          const newRoomId = await connectToRoom();
          if (newRoomId) {
            // Simply use the full room ID without substring
            toast({
              title: "Room Created",
              description: `Your translation room is ready. ID: ${newRoomId}`,
            });
          }
        }
        
        // Start microphone recording
        const started = await startMicrophone();
        setIsActive(started);
      } catch (error) {
        console.error('Error starting translation:', error);
        toast({
          title: "Error",
          description: "Failed to start translation. Please check microphone permissions.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Toggle QR code visibility
  const toggleQRCode = () => {
    setShowQRCode(prevState => !prevState);
  };
  
  // Copy room link to clipboard
  const copyRoomLink = () => {
    const url = getRoomUrl() || window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Room link copied to clipboard",
    });
  };
  
  const handleModeChange = (mode: 'translation' | 'tutor') => {
    if (isActive) {
      // Stop any active sessions when switching modes
      stopMicrophone();
      setIsActive(false);
    }
    setCurrentMode(mode);
    setShowQRCode(false);
  };

  // Debug log for initial render and state changes
  useEffect(() => {
    //console.log("Room state:", roomState);
    console.log("Is active:", isActive);
    console.log("Current language:", targetLanguage);
    console.log("Show QR code:", showQRCode);
  }, [roomState, isActive, targetLanguage, showQRCode]);

  // Add UI for testing echo mode
  const toggleEchoMode = async () => {
    console.log('[Index] Toggling echo mode');
    try {
      if (echo) {
          const response = await fetch(`http://localhost:8000/toggle-mirror-mode?enabled=False`);
          if (response.ok) {
            const result = await response.json();
            console.log('[Index] Echo mode disabled:', result);
          }

          setIsEcho(false);
          if (buttonEcho.current) {
            buttonEcho.current.style.backgroundColor = 'gray';
            return;
          }
      }

      const response = await fetch(`http://localhost:8000/toggle-mirror-mode?enabled=True`);
      if (response.ok) {
        const result = await response.json();
        console.log('[Index] Echo mode toggled:', result);

        if (buttonEcho.current) {
          setIsEcho(true);
          buttonEcho.current.style.backgroundColor = 'lightblue';
        }

        toast({
          title: "Echo Mode Enabled",
          description: "Your speech will be echoed back to you without translation.",
        });
      } else {
        console.error('[Index] Failed to toggle echo mode:', await response.text());
      }
    } catch (error) {
      console.error('[Index] Error toggling echo mode:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10">
        <div className="absolute top-4 right-4">
          <ModeToggle
            currentMode={currentMode}
            onModeChange={handleModeChange}
          />
        </div>
        
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Madellang</h1>
            <p className="text-muted-foreground">Real-time voice translation</p>
            
            <div className="flex items-center justify-center mt-4 space-x-1 bg-secondary/50 rounded-lg p-1 w-fit mx-auto">
              <Button
                variant={currentMode === 'translation' ? 'default' : 'ghost'}
                onClick={() => handleModeChange('translation')}
                className="rounded-sm px-3"
              >
                Translation
              </Button>
              <Button
                variant={currentMode === 'tutor' ? 'default' : 'ghost'}
                onClick={() => handleModeChange('tutor')}
                className="rounded-sm px-3"
              >
                Language Tutor
              </Button>
            </div>
          </div>
          
          {currentMode === 'translation' ? (
            <Card className="overflow-visible border-0 shadow-lg animate-scale-in">
              <CardContent className="p-6 space-y-6">
                <AudioStatus 
                  isListening={isActive} 
                  isSpeaking={isSpeaking} 
                />
                
                <AudioVisualizer 
                  isActive={isActive}
                  audioStream={audioStream}
                />
                
                {/* Fixed Language Selector: Using value/onChange instead of selectedLanguage */}
                <div className="relative" style={{ zIndex: 50 }}>
                  <LanguageSelector
                    value={targetLanguage}
                    onChange={handleLanguageChange}
                    disabled={false}
                  />
                </div>
                
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
                  
                  {/* Share Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleQRCode}
                    disabled={false}
                    className="relative z-10"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* QR Code Display */}
                {showQRCode && (
                  <div className="mt-4 p-4 bg-card rounded-lg border animate-fade-in">
                    <div className="flex flex-col items-center gap-4">
                      <h3 className="text-sm font-medium">Scan to join this room</h3>
                      
                      <QRCodeSVG value={getRoomUrl() || window.location.href} size={150} />
                      <div className="flex items-center gap-2 w-full">
                        <Input value={getRoomUrl() || window.location.href} readOnly />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyRoomLink}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <LanguageTutor />
          )}
        </div>
      </div>
      <div className="mt-4 p-4 bg-card rounded-lg border animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium">Audio Output Control</h3>
          
          <AudioOutputControl
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
          />
        </div>
      </div>
      <div className="mt-4 p-4 bg-card rounded-lg border animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium">Echo Test</h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleEchoMode}
            className="ml-2"
            ref={buttonEcho}
          >
            Echo Test
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;