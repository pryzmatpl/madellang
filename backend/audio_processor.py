import asyncio
import io
import numpy as np
from typing import Optional, Dict
import time

class AudioProcessor:
    def __init__(self, model_manager, translation_service=None):
        self.model_manager = model_manager
        self.translation_service = translation_service
        # Audio settings
        self.sample_rate = 16000
        self.chunk_size = 4096
        # Add buffer management
        self.buffer = {}  # room_id -> user_id -> buffer
        self.last_processing = {}  # room_id -> user_id -> timestamp
        self.min_process_interval = 0.5  # Minimum seconds between processing
    
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

    async def process_audio_chunk(self, room_id: str, user_id: str, audio_chunk: bytes, target_lang: str) -> Dict:
        """
        Process an incoming audio chunk, buffering as needed
        
        Returns a dict with translation results when enough audio has been collected,
        otherwise returns None
        """
        # Initialize buffer if needed
        if room_id not in self.buffer:
            self.buffer[room_id] = {}
            self.last_processing[room_id] = {}
            
        if user_id not in self.buffer[room_id]:
            self.buffer[room_id][user_id] = []
            self.last_processing[room_id][user_id] = 0
            
        # Add chunk to buffer
        self.buffer[room_id][user_id].append(audio_chunk)
        
        # Calculate total buffered audio size
        total_size = sum(len(chunk) for chunk in self.buffer[room_id][user_id])
        
        # Check if we should process now (enough data + minimum interval passed)
        current_time = time.time()
        time_since_last = current_time - self.last_processing[room_id].get(user_id, 0)
        
        should_process = (
            total_size >= self.chunk_size * 3 and  # At least 3 chunks (~750ms of audio)
            time_since_last >= self.min_process_interval  # Don't process too frequently
        )
        
        if should_process:
            # Concatenate all chunks
            all_audio = b''.join(self.buffer[room_id][user_id])
            
            # Clear buffer but save a small tail to prevent cutting words
            tail_size = min(len(all_audio) // 4, self.chunk_size)  # Keep up to 1/4 of the buffer
            tail = all_audio[-tail_size:] if tail_size > 0 else b''
            self.buffer[room_id][user_id] = [tail] if tail else []
            
            # Update processing timestamp
            self.last_processing[room_id][user_id] = current_time
            
            # Process the audio (uses existing process_audio method)
            # Get source language from room manager if available
            source_lang = None  # This would come from room manager in a real implementation
            
            # Actually process the audio
            translated_audio = await self.process_audio(all_audio, target_lang, source_lang)
            
            # Return text result for now - we'll modify the room_manager to handle audio
            if translated_audio and len(translated_audio) > 0:
                # In a real implementation, you'd extract the text from somewhere
                # For now, let's return a dummy structure that main.py expects
                return {
                    "translated_text": "Audio processed successfully",
                    "audio_data": translated_audio
                }
        
        # Not enough data to process yet
        return None