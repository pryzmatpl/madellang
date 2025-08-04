import io
import logging
import numpy as np
import soundfile as sf
from typing import Optional, Dict, Any
import sys

# Add the deps directory to the Python path
sys.path.insert(0, "./deps")

# Import the custom torch loader to set up paths
from torch_loader import get_device_info

# Import AMD GPU utilities
from amd_gpu_utils import configure_gpu_environment

# Configure GPU environment early in the startup
gpu_config = configure_gpu_environment()

import torch

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self, use_local_models: bool = True, elevenlabs_api_key: Optional[str] = None):
        """
        Initialize TTS service with local models or API fallback
        
        Args:
            use_local_models: Whether to use local TTS models
            elevenlabs_api_key: API key for ElevenLabs (fallback)
        """
        self.use_local_models = use_local_models
        self.elevenlabs_api_key = elevenlabs_api_key
        self.tts_model = None
        self.device = self._get_device()
        
        if use_local_models:
            self._init_local_models()
        else:
            logger.info("TTS service initialized in API mode")
    
    def _get_device(self) -> str:
        """Get the appropriate device for TTS processing"""
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch, 'hip') and torch.hip.is_available():
            return "cuda"  # ROCm uses CUDA API
        else:
            return "cpu"
    
    def _init_local_models(self):
        """Initialize local TTS models"""
        try:
            # Add TTS to path
            import sys
            sys.path.append("./deps/TTS")
            
            from TTS.api import TTS
            
            # Initialize TTS model - use a multilingual model for better language support
            model_name = "tts_models/multilingual/multi-dataset/xtts_v2"
            
            logger.info(f"Loading TTS model: {model_name}")
            self.tts_model = TTS(model_name, gpu=torch.cuda.is_available())
            logger.info("TTS model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading TTS model: {e}")
            self.tts_model = None
            # Try simpler model
            try:
                from TTS.api import TTS
                self.tts_model = TTS("tts_models/en/vctk/vits", gpu=torch.cuda.is_available())
                logger.info("Loaded fallback TTS model")
            except Exception as fallback_error:
                logger.error(f"Error loading fallback TTS model: {fallback_error}")
                self.tts_model = None
                # Try basic TTS
                try:
                    from TTS.api import TTS
                    self.tts_model = TTS("tts_models/en/ljspeech/tacotron2-DDC", gpu=torch.cuda.is_available())
                    logger.info("Loaded basic TTS model")
                except Exception as basic_error:
                    logger.error(f"Error loading basic TTS model: {basic_error}")
                    self.tts_model = None
    
    def text_to_speech(self, text: str, lang: str = "en") -> bytes:
        """
        Convert text to speech
        
        Args:
            text: Text to convert to speech
            lang: Target language code
            
        Returns:
            Audio data as bytes (WAV format)
        """
        if not text or text.isspace():
            return b""
        
        try:
            if self.use_local_models and self.tts_model is not None:
                return self._local_tts(text, lang)
            elif self.elevenlabs_api_key:
                return self._api_tts(text, lang)
            else:
                # Use gTTS as primary method when no local models or API key
                return self._gtts_fallback(text, lang)
                
        except Exception as e:
            logger.error(f"TTS error: {e}")
            # Try gTTS as final fallback
            return self._gtts_fallback(text, lang)
    
    def _local_tts(self, text: str, lang: str) -> bytes:
        """Convert text to speech using local TTS model"""
        try:
            # Map language codes to TTS supported languages
            lang_map = {
                "en": "en",
                "es": "es", 
                "fr": "fr",
                "de": "de",
                "it": "it",
                "pt": "pt",
                "ru": "ru",
                "ja": "ja",
                "ko": "ko",
                "zh": "zh"
            }
            
            target_lang = lang_map.get(lang, "en")
            
            # Generate speech
            wav = self.tts_model.tts(text=text, language=target_lang)
            
            # Convert to bytes
            buffer = io.BytesIO()
            sf.write(buffer, wav, 22050, format='wav')
            buffer.seek(0)
            return buffer.read()
            
        except Exception as e:
            logger.error(f"Local TTS error: {e}")
            return b""
    
    def _api_tts(self, text: str, lang: str) -> bytes:
        """Convert text to speech using ElevenLabs API"""
        if not self.elevenlabs_api_key:
            logger.warning("No ElevenLabs API key provided")
            return b""
        
        try:
            import requests
            
            # Map language to voice ID (you can customize this)
            voice_map = {
                "en": "pNInz6obpgDQGcFmaJgB",  # Adam voice
                "es": "ErXwobaYiN019PkySvjV",  # Antoni voice
                "fr": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "de": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "it": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "pt": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "ru": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "ja": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "ko": "VR6AewLTigWG4xSOukaG",  # Josh voice
                "zh": "VR6AewLTigWG4xSOukaG"   # Josh voice
            }
            
            voice_id = voice_map.get(lang, "pNInz6obpgDQGcFmaJgB")
            
            response = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "Content-Type": "application/json",
                    "xi-api-key": self.elevenlabs_api_key
                },
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.5
                    }
                }
            )
            
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"ElevenLabs API error: {response.text}")
                return b""
                
        except Exception as e:
            logger.error(f"API TTS error: {e}")
            return b""
    
    def get_available_languages(self) -> Dict[str, str]:
        """Get available languages for TTS"""
        return {
            "en": "English",
            "es": "Spanish", 
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ru": "Russian",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese"
        }
    
    def _gtts_fallback(self, text: str, lang: str) -> bytes:
        """Fallback TTS using Google Text-to-Speech"""
        try:
            from gtts import gTTS
            import io
            
            # Create gTTS object
            tts = gTTS(text=text, lang=lang, slow=False)
            
            # Save to bytes buffer
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            buffer.seek(0)
            
            return buffer.read()
            
        except Exception as e:
            logger.error(f"gTTS fallback error: {e}")
            return b""
    
    def is_available(self) -> bool:
        """Check if TTS service is available"""
        return self.tts_model is not None or self.elevenlabs_api_key is not None 