import asyncio
import io
import numpy as np
from typing import Optional, Dict

class AudioProcessor:
    def __init__(self, model_manager, translation_service=None):
        self.model_manager = model_manager
        self.translation_service = translation_service
        # Audio settings
        self.sample_rate = 16000
        self.chunk_size = 4096
    
    async def process_audio(self, audio_data: bytes, target_lang: str, source_lang: Optional[str] = None) -> bytes:
        """
        Process audio through the Translation → TTS pipeline
        """
        # Process in a separate thread to avoid blocking
        return await asyncio.to_thread(self._process_audio_sync, audio_data, target_lang, source_lang)
    
    def _process_audio_sync(self, audio_data: bytes, target_lang: str, source_lang: Optional[str] = None) -> bytes:
        """
        Synchronous version of the audio processing pipeline using Whisper for translation
        """
        try:
            # Convert bytes to numpy array for processing
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
            
            if self.translation_service:
                # Use Whisper for both STT and translation in one step
                result = self.translation_service.transcribe_and_translate(
                    audio_np, 
                    source_lang=source_lang, 
                    target_lang=target_lang
                )
                
                translated_text = result["translated_text"]
                detected_lang = result["detected_language"]
                
                # If we got no translation, skip further processing
                if not translated_text or translated_text.isspace():
                    return b""
                    
                # Log the translation process
                print(f"Translated: [{detected_lang}] {result['original_text']} -> [{target_lang}] {translated_text}")
            else:
                # Fallback to previous pipeline if no translation service
                transcript = self.model_manager.speech_to_text(audio_np)
                
                # Skip empty transcripts
                if not transcript or transcript.isspace():
                    return b""
                
                # Detect language if not provided
                if source_lang is None:
                    source_lang = self.model_manager.detect_language(audio_np)
                
                # Skip translation if source and target languages are the same
                if source_lang == target_lang:
                    translated_text = transcript
                else:
                    # Translation
                    translated_text = self.model_manager.translate_text(
                        transcript, source_lang, target_lang
                    )
            
            # Text-to-Speech 
            translated_audio = self.model_manager.text_to_speech(translated_text, target_lang)
            
            # Return the processed audio as bytes
            return translated_audio
            
        except Exception as e:
            print(f"Error in audio processing: {e}")
            return b""