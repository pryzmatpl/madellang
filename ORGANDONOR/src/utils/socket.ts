import { io, Socket } from 'socket.io-client';
import { AudioData, TranslatedAudio } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private audioHandlers: ((data: TranslatedAudio) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  connect(roomId: string): void {
    // In a production environment, this would point to your actual server
    const serverUrl = import.meta.env.VITE_SOCKET_SERVER || 'http://localhost:3000';
    
    this.socket = io(serverUrl, {
      query: { roomId },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.notifyConnectionHandlers(true);
      console.log('Connected to socket server');
    });

    this.socket.on('disconnect', () => {
      this.notifyConnectionHandlers(false);
      console.log('Disconnected from socket server');
    });

    this.socket.on('translatedAudio', (data: TranslatedAudio) => {
      this.notifyAudioHandlers(data);
    });

    this.socket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendAudio(audioData: AudioData): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('audioData', audioData);
    } else {
      console.error('Cannot send audio: Socket not connected');
    }
  }

  onTranslatedAudio(handler: (data: TranslatedAudio) => void): void {
    this.audioHandlers.push(handler);
  }

  onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  private notifyAudioHandlers(data: TranslatedAudio): void {
    this.audioHandlers.forEach(handler => handler(data));
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketService = new SocketService();