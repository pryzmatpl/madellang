import React, { useState, useEffect, useCallback } from 'react';
import translationService from '../services/TranslationService';
import AudioPlayer from './AudioPlayer';
import RecordingIndicator from './RecordingIndicator';
import './TranslationRoom.css';
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import LanguageSelector from "@/components/LanguageSelector";
import AudioVisualizer from "@/components/AudioVisualizer";
import AudioStatus from "@/components/AudioStatus";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { cn } from "@/lib/utils";
import ModeToggle from "@/components/ModeToggle";
import LanguageTutor from "@/components/LanguageTutor";

interface Language {
  code: string;
  name: string;
}

interface TranslationRoomProps {
  roomId: string;
  initialLanguage?: string;
  onLeaveRoom?: () => void;
}

const TranslationRoom: React.FC<TranslationRoomProps> = ({ 
  roomId, 
  initialLanguage = 'en',
  onLeaveRoom 
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [latestAudio, setLatestAudio] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Fetch available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languageList = await translationService.getAvailableLanguages();
        setLanguages(languageList);
      } catch (err) {
        console.error('Failed to fetch languages:', err);
        setErrorMessage('Failed to load available languages');
      }
    };
    
    const fetchSystemInfo = async () => {
      try {
        const info = await translationService.getSystemInfo();
        setSystemInfo(info);
      } catch (err) {
        console.error('Failed to fetch system info:', err);
      }
    };
    
    fetchLanguages();
    fetchSystemInfo();
  }, []);

  // Set up event listeners
  useEffect(() => {
    const onStatusChange = (newStatus: string) => {
      setStatus(newStatus);
    };
    
    const onAudio = (audioBlob: Blob) => {
      setLatestAudio(audioBlob);
    };
    
    const onError = (error: Error) => {
      setErrorMessage(error.message);
    };
    
    // Register listeners
    translationService.on('statusChange', onStatusChange);
    translationService.on('audio', onAudio);
    translationService.on('error', onError);
    
    // Clean up
    return () => {
      translationService.off('statusChange', onStatusChange);
      translationService.off('audio', onAudio);
      translationService.off('error', onError);
    };
  }, []);

  // Connect to room
  useEffect(() => {
    const connectToRoom = async () => {
      try {
        await translationService.joinRoom({
          roomId,
          targetLanguage: selectedLanguage,
          onConnected: (id) => {
            setUserId(id);
            setIsConnected(true);
            setErrorMessage(null);
          },
          onDisconnected: () => {
            setIsConnected(false);
            setIsRecording(false);
          },
          onError: (error) => {
            setErrorMessage(error.message);
          },
          onStatusChange: (newStatus) => {
            setStatus(newStatus);
          },
          onTranslationReceived: (audioBlob) => {
            setLatestAudio(audioBlob);
          }
        });
      } catch (error) {
        console.error('Failed to join room:', error);
        setErrorMessage('Failed to join translation room');
      }
    };
    
    connectToRoom();
    
    // Disconnect when component unmounts
    return () => {
      translationService.leaveRoom();
    };
  }, [roomId, selectedLanguage]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    translationService.changeLanguage(newLanguage);
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      translationService.stopRecording();
      setIsRecording(false);
    } else {
      translationService.startRecording();
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleLeaveRoom = useCallback(() => {
    translationService.leaveRoom().then(() => {
      if (onLeaveRoom) {
        onLeaveRoom();
      }
    });
  }, [onLeaveRoom]);

  return (
    <div className="translation-room">
      <div className="room-header">
        <h2>Room: {roomId}</h2>
        {userId && <p>Connected as: {userId}</p>}
      </div>
      
      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="status-bar">
        <RecordingIndicator isRecording={isRecording} />
        <span className="status-text">{status}</span>
      </div>
      
      <div className="controls">
        <div className="language-selector">
          <label htmlFor="target-language">Translate to:</label>
          <select 
            id="target-language" 
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={!isConnected}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="action-buttons">
          <button 
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={!isConnected}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <button 
            className="leave-button"
            onClick={handleLeaveRoom}
          >
            Leave Room
          </button>
        </div>
      </div>
      
      <div className="audio-section">
        <h3>Latest Translation</h3>
        <AudioPlayer audioBlob={latestAudio} autoPlay={true} />
      </div>
      
      {systemInfo && (
        <div className="system-info">
          <h4>System Information</h4>
          <div className="info-grid">
            <div>
              <strong>PyTorch:</strong> {systemInfo.pytorch_version}
            </div>
            <div>
              <strong>Whisper:</strong> {systemInfo.whisper_version}
            </div>
            <div>
              <strong>GPU:</strong> {systemInfo.gpu_type || 'N/A'}
            </div>
            <div>
              <strong>Model:</strong> {systemInfo.whisper_model}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationRoom; 