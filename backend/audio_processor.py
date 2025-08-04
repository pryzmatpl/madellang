import asyncio
import io
import numpy as np
from typing import Optional, Dict, Any, Tuple
import time
import logging
import wave

logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self, model_manager, translation_service=None, tts_service=None):
        self.attatch_wav_header = True
        self.model_manager = model_manager
        self.translation_service = translation_service
        self.tts_service = tts_service
        self.mirror_mode = True  # Initialize mirror mode to True by default
        # Audio settings
        self.sample_rate = 44100
        self.chunk_size = 8192
        # Add buffer management
        self.buffer = {}  # room_id -> user_id -> buffer
        self.last_processing = {}  # room_id -> user_id -> timestamp
        self.min_process_interval = 0.5  # Minimum seconds between processing
        self.audio_buffers = {}  # Store audio chunks by user/room
        self.processing_lock = {}  # Prevent concurrent processing for same user
        logger.info("Audio processor initialized")
    
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
            
            # Convert to float32 for Whisper
            audio_float = audio_np.astype(np.float32) / 32767.0
            
            if self.translation_service:
                # Use Whisper for both STT and translation in one step
                result = self.translation_service.transcribe_and_translate(
                    audio_float, 
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
            if self.tts_service:
                translated_audio = self.tts_service.text_to_speech(translated_text, target_lang)
            else:
                translated_audio = self.model_manager.text_to_speech(translated_text, target_lang)
            
            # Return the processed audio as bytes
            return translated_audio
            
        except Exception as e:
            print(f"Error in audio processing: {e}")
            return b""

    def to_wav(self, audio_chunk: bytes, sample_rate: int=44100, num_channels: int = 1, sample_width: int = 2):
        # Create a BytesIO object to hold the WAV data
        wav_io = io.BytesIO()

        # Create a WAV file in memory
        with wave.open(wav_io, 'wb') as wav_file:
            wav_file.setnchannels(num_channels)
            wav_file.setsampwidth(sample_width)  # 2 bytes for 16-bit audio
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_chunk)

        # Return the WAV data as bytes
        return wav_io.getvalue()

    async def process_audio_chunk(self, room_id: str, user_id: str, 
                                 audio_chunk: bytes, target_lang: str, websocket) -> Optional[Dict]:
        """Process incoming audio chunk and return translation result"""
        try:
            # Add to buffer and get complete buffer
            complete_buffer = self._add_to_buffer(room_id, user_id, audio_chunk)
            
            # Convert audio bytes to numpy array - create a writable copy
            # audio_chunk is raw PCM data (int16), so convert to float32 properly
            audio_np = np.frombuffer(complete_buffer, dtype=np.int16).astype(np.float32) / 32767.0
            
            # Process only if we have enough audio data (at least 0.5 seconds)
            if len(audio_np) < 22050:  # Assuming 0.5s of 44.1kHz sample rate
                return None
                
            # Perform speech recognition and translation
            logger.debug(f"Processing {len(audio_np)} samples for user {user_id}")
            
            # Transcribe and translate
            result = self.translation_service.transcribe_and_translate(
                audio_np, target_lang=target_lang
            )
            
            # If mirror mode is enabled, send back the original audio
            if self.mirror_mode:
                wav_data = self.to_wav(audio_chunk)
                logger.info(f"Mirroring audio back to sender: {len(audio_chunk)} bytes")
                await websocket.send_bytes(wav_data)
            
            # Only return results if we have text
            if result and result.get("translated_text") and len(result["translated_text"]) > 0:
                logger.info(f"Translation result: {result['translated_text'][:50]}...")

                # Run text-to-speech:
                try:
                    if self.tts_service:
                        # Convert the translated text to an audio byte array (WAV format)
                        translated_audio = self.tts_service.text_to_speech(
                            result["translated_text"],
                            lang=target_lang
                        )
                    else:
                        # Fallback to model manager
                        translated_audio = self.model_manager.text_to_speech(
                            result["translated_text"],
                            target_lang
                        )

                    # Ensure translated_audio is in bytes format
                    if isinstance(translated_audio, np.ndarray):
                        translated_audio = translated_audio.tobytes()
                    elif not isinstance(translated_audio, bytes):
                        translated_audio = self.to_wav(translated_audio)

                    # Send the translated audio back through WebSocket
                    await websocket.send_bytes(translated_audio)

                except Exception as tts_error:
                    logger.error(f"Error in text-to-speech conversion: {tts_error}")
                    return None
                
                # Clear buffer after successful processing
                self._clear_buffer(room_id, user_id)

                # Return the result for WebSocket transmission
                return {
                    "type": "translation_result",
                    "original_text": result.get("original_text", ""),
                    "translated_text": result.get("translated_text", ""),
                    "language": result.get("detected_language", "unknown"),
                    "user_id": user_id
                }
                
            return None
            
        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}")
            return None

    def _add_to_buffer(self, room_id: str, user_id: str, audio_chunk: bytes) -> bytes:
        """Add audio chunk to user's buffer and return the complete buffer"""
        buffer_key = f"{room_id}_{user_id}"
        
        if buffer_key not in self.audio_buffers:
            self.audio_buffers[buffer_key] = bytearray()
            
        # Add new chunk to buffer
        self.audio_buffers[buffer_key].extend(audio_chunk)
        
        # Limit buffer size (keep last 5 seconds)
        # audio_chunk is int16 PCM data, so 2 bytes per sample
        max_buffer_size = 44100 * 2 * 5  # 5 seconds at 44.1kHz, 2 bytes per int16 sample
        if len(self.audio_buffers[buffer_key]) > max_buffer_size:
            self.audio_buffers[buffer_key] = self.audio_buffers[buffer_key][-max_buffer_size:]
            
        return bytes(self.audio_buffers[buffer_key])
        
    def _clear_buffer(self, room_id: str, user_id: str):
        """Clear audio buffer for a user"""
        buffer_key = f"{room_id}_{user_id}"
        if buffer_key in self.audio_buffers:
            self.audio_buffers[buffer_key] = bytearray()

    def toggle_mirror_mode(self, enabled=None):
        """Toggle or set mirror mode"""
        if enabled is not None:
            self.mirror_mode = enabled
        else:
            self.mirror_mode = not self.mirror_mode
        
        logger.info(f"Audio mirror mode {'enabled' if self.mirror_mode else 'disabled'}")
        return self.mirror_mode