/**
 * Application configuration
 */

// Backend API URL
export const BACKEND_URL = 'http://localhost:8000';

// WebSocket URL (derived from the backend URL)
export const WS_URL = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://');

// Application settings
export const APP_SETTINGS = {
  // Default language if none is selected
  defaultLanguage: 'en',
  
  // Audio recording settings
  audioSettings: {
    sampleRate: 16000,
    numberOfChannels: 1
  },
  
  // Chunk size for audio transmission (in milliseconds)
  audioChunkSize: 3000,
}; 