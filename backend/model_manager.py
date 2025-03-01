import os
import numpy as np
from typing import Optional, Dict, List
import io

class ModelManager:
    def __init__(self):
        # Determine which mode to use based on environment variable
        self.use_local_models = os.getenv("USE_LOCAL_MODELS", "false").lower() == "true"
        
        # Initialize models based on mode
        if self.use_local_models:
            self._init_local_models()
        else:
            self._init_api_clients()
    
    def _init_local_models(self):
        """Initialize local AI models"""
        try:
            # Speech-to-Text (Whisper or Vosk)
            import whisper
            self.stt_model = whisper.load_model("small")
            
            # Translation (e.g., MarianMT from HuggingFace)
            from transformers import MarianMTModel, MarianTokenizer
            self.translation_models = {}
            
            # Text-to-Speech (e.g., Coqui TTS)
            import TTS
            from TTS.utils.synthesizer import Synthesizer
            self.tts_model = Synthesizer(
                tts_checkpoint="path/to/model.pth",
                tts_config_path="path/to/config.json",
                vocoder_checkpoint="path/to/vocoder.pth",
                vocoder_config="path/to/vocoder_config.json"
            )
            
            print("Local models loaded successfully")
            
        except Exception as e:
            print(f"Error loading local models: {e}")
            # Fallback to API mode
            self.use_local_models = False
            self._init_api_clients()
    
    def _init_api_clients(self):
        """Initialize API clients for cloud services"""
        # OpenAI API (for Whisper API)
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        
        # DeepL API (for translation)
        self.deepl_api_key = os.getenv("DEEPL_API_KEY", "")
        
        # ElevenLabs API (for TTS)
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")
        
        print("API clients initialized")
    
    def speech_to_text(self, audio_data: np.ndarray) -> str:
        """Convert speech to text using the appropriate model"""
        if self.use_local_models:
            # Use local Whisper model
            result = self.stt_model.transcribe(audio_data)
            return result["text"]
        else:
            # Use OpenAI Whisper API
            import openai
            openai.api_key = self.openai_api_key
            
            # Save audio to temporary file
            temp_file = io.BytesIO()
            np.save(temp_file, audio_data)
            temp_file.seek(0)
            
            try:
                response = openai.Audio.transcribe("whisper-1", temp_file)
                return response["text"]
            except Exception as e:
                print(f"OpenAI API error: {e}")
                return ""
    
    def translate_text(self, text: str, target_lang: str) -> str:
        """Translate text to the target language"""
        if self.use_local_models:
            # Use local translation model
            # Would need to load the specific model for the language pair
            # This is simplified for brevity
            return f"Translated: {text}"
        else:
            # Use DeepL API
            import requests
            
            try:
                response = requests.post(
                    "https://api.deepl.com/v2/translate",
                    data={
                        "auth_key": self.deepl_api_key,
                        "text": text,
                        "target_lang": target_lang.upper()
                    }
                )
                result = response.json()
                return result["translations"][0]["text"]
            except Exception as e:
                print(f"DeepL API error: {e}")
                return text
    
    def text_to_speech(self, text: str, target_lang: str) -> bytes:
        """Convert text to speech in the target language"""
        if self.use_local_models:
            # Use local TTS model
            wavs = self.tts_model.tts(text)
            
            # Convert to bytes
            buffer = io.BytesIO()
            import soundfile as sf
            sf.write(buffer, wavs, 22050, format='wav')
            buffer.seek(0)
            return buffer.read()
        else:
            # Use ElevenLabs API
            import requests
            
            try:
                voice_id = "pNInz6obpgDQGcFmaJgB"  # Example voice ID
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
                    print(f"ElevenLabs API error: {response.text}")
                    return b""
            except Exception as e:
                print(f"TTS API error: {e}")
                return b""