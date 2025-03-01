import asyncio
import io
from typing import Optional, Dict
import numpy as np

class AudioProcessor:
    def __init__(self, model_manager):
        self.model_manager = model_manager
        # Audio settings
        self.sample_rate = 16000
        self.chunk_size = 4096
    
    async def process_audio(self, audio_data: bytes, target_lang: str) -> bytes:
        """
        Process audio through the STT → Translation → TTS pipeline
        """
        # Process in a separate thread to avoid blocking
        return await asyncio.to_thread(self._process_audio_sync, audio_data, target_lang)
    
    def _process_audio_sync(self, audio_data: bytes, target_lang: str) -> bytes:
        """
        Synchronous version of the audio processing pipeline
        """
        try:
            # Convert bytes to numpy array for processing
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
            
            # 1. Speech-to-Text
            transcript = self.model_manager.speech_to_text(audio_np)
            
            # Skip empty transcripts
            if not transcript or transcript.isspace():
                return b""
            
            # 2. Translation
            translated_text = self.model_manager.translate_text(transcript, target_lang)
            
            # 3. Text-to-Speech
            translated_audio = self.model_manager.text_to_speech(translated_text, target_lang)
            
            # Return the processed audio as bytes
            return translated_audio
            
        except Exception as e:
            print(f"Error in audio processing: {e}")
            return b""