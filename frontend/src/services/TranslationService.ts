import { EventEmitter } from 'events';

interface SystemInfo {
  pytorch_version: string;
  cuda_available: boolean;
  whisper_version: string;
  device_name?: string;
  gpu_type?: string;
  whisper_model: string;
}

interface TranslationOptions {
  roomId: string;
  targetLanguage: string;
  username?: string;
  onConnected?: (userId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onTranslationReceived?: (audioBlob: Blob) => void;
  onStatusChange?: (status: string) => void;
}

export class TranslationService extends EventEmitter {
  private socket: WebSocket | null = null;
  private connected = false;
  private userId: string | null = null;
  private roomId: string | null = null;
  private targetLanguage: string = 'en';
  private recording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private recordingInterval: NodeJS.Timeout | null = null;
  private baseUrl: string;
  
  constructor(baseUrl = '') {
    super();
    this.baseUrl = baseUrl || (window.location.protocol === 'https:' 
      ? `wss://${window.location.host}` 
      : `ws://localhost:8000`);
      
    // If running in development with separate backend
    if (process.env.NODE_ENV === 'development') {
      this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'ws://localhost:8000';
    }
  }
  
  async getSystemInfo(): Promise<SystemInfo> {
    const httpUrl = this.baseUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    const response = await fetch(`${httpUrl}/system-info`);
    if (!response.ok) {
      throw new Error(`Failed to get system info: ${response.statusText}`);
    }
    return await response.json();
  }
  
  async getAvailableLanguages(): Promise<{code: string, name: string}[]> {
    const httpUrl = this.baseUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    const response = await fetch(`${httpUrl}/available-languages`);
    if (!response.ok) {
      throw new Error(`Failed to get languages: ${response.statusText}`);
    }
    const data = await response.json();
    return data.languages;
  }
  
  async joinRoom(options: TranslationOptions): Promise<void> {
    if (this.connected) {
      await this.leaveRoom();
    }
    
    this.roomId = options.roomId;
    this.targetLanguage = options.targetLanguage;
    
    try {
      const wsUrl = `${this.baseUrl}/ws/${this.roomId}?target_lang=${this.targetLanguage}`;
      
      if (options.onStatusChange) {
        options.onStatusChange('Connecting to server...');
      }
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        this.connected = true;
        if (options.onStatusChange) {
          options.onStatusChange('Connected to server');
        }
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(event, options);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (options.onError) {
          options.onError(new Error('WebSocket connection error'));
        }
      };
      
      this.socket.onclose = () => {
        this.connected = false;
        this.userId = null;
        if (options.onDisconnected) {
          options.onDisconnected();
        }
        if (options.onStatusChange) {
          options.onStatusChange('Disconnected from server');
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  private handleMessage(event: MessageEvent, options: TranslationOptions) {
    // Handle text messages (JSON)
    if (typeof event.data === 'string') {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          this.userId = data.user_id;
          if (options.onConnected && this.userId) {
            options.onConnected(this.userId);
          }
          if (options.onStatusChange) {
            options.onStatusChange(`Connected as ${this.userId}`);
          }
        } else if (data.type === 'error') {
          if (options.onError) {
            options.onError(new Error(data.message));
          }
        } else if (data.type === 'language_changed') {
          this.targetLanguage = data.language;
          this.emit('languageChanged', data.language);
        }
        
        // Always emit the message for custom handling
        this.emit('message', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    } 
    // Handle binary messages (audio)
    else if (event.data instanceof Blob) {
      if (options.onTranslationReceived) {
        options.onTranslationReceived(event.data);
      }
      this.emit('audio', event.data);
    }
  }
  
  async startRecording(): Promise<void> {
    if (this.recording || !this.connected || !this.socket) {
      return;
    }
    
    try {
      this.emit('statusChange', 'Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 16000, // Match backend sample rate
      });
      
      this.emit('statusChange', 'Recording started');
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm', // Most compatible format
      });
      
      // Send data whenever it becomes available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket && this.connected) {
          this.socket.send(event.data);
        }
      };
      
      // Request data every 250ms
      this.mediaRecorder.start(250);
      this.recording = true;
      
      // Visual feedback for recording status
      this.recordingInterval = setInterval(() => {
        this.emit('recordingTick');
      }, 500);
    } catch (error) {
      console.error('Error starting recording:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      this.emit('statusChange', 'Failed to access microphone');
    }
  }
  
  stopRecording(): void {
    if (!this.recording || !this.mediaRecorder) {
      return;
    }
    
    this.mediaRecorder.stop();
    this.recording = false;
    
    // Stop all tracks in the stream
    if (this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    
    this.emit('statusChange', 'Recording stopped');
  }
  
  changeLanguage(language: string): void {
    if (!this.connected || !this.socket) {
      return;
    }
    
    this.socket.send(JSON.stringify({
      type: 'change_language',
      language: language
    }));
  }
  
  async leaveRoom(): Promise<void> {
    this.stopRecording();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connected = false;
    this.userId = null;
    this.roomId = null;
    this.emit('statusChange', 'Left room');
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  isRecording(): boolean {
    return this.recording;
  }
  
  getCurrentRoomId(): string | null {
    return this.roomId;
  }
  
  getUserId(): string | null {
    return this.userId;
  }
  
  getCurrentLanguage(): string {
    return this.targetLanguage;
  }
}

export default new TranslationService(); 