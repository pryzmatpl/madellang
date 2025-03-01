export interface RoomData {
  id: string;
  url: string;
}

export interface TranslationState {
  isConnected: boolean;
  isTranslating: boolean;
  selectedLanguage: string;
  roomData: RoomData | null;
  error: string | null;
}

export interface AudioData {
  audio: ArrayBuffer;
  language: string;
  roomId: string;
}

export interface TranslatedAudio {
  audio: ArrayBuffer;
  sourceLanguage: string;
  targetLanguage: string;
}

export type SupportedLanguage = {
  code: string;
  name: string;
};