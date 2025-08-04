import os
import numpy as np
from typing import Optional, Dict, List, Any
import io
import sys
from pathlib import Path

# Add the deps directory to the Python path and use custom PyTorch
sys.path.insert(0, "./deps")
from torch_loader import get_device_info
from whisper_loader import get_whisper_info
import torch

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, MarianMTModel, MarianTokenizer
import whisper

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
            # Speech-to-Text (Whisper)
            self.stt_model = whisper.load_model("medium")
            
            # Translation (MarianMT from HuggingFace)
            self.translation_models = {}
            self.translation_tokenizers = {}
            
            # Load available translation models from deps directory
            models_dir = Path("./deps/models")
            if models_dir.exists():
                for model_dir in models_dir.glob("*-*"):
                    if model_dir.is_dir():
                        lang_pair = model_dir.name
                        try:
                            print(f"Loading translation model: {lang_pair}")
                            self.translation_models[lang_pair] = AutoModelForSeq2SeqLM.from_pretrained(
                                str(model_dir)
                            ).to(self._get_device())
                            self.translation_tokenizers[lang_pair] = AutoTokenizer.from_pretrained(
                                str(model_dir)
                            )
                        except Exception as e:
                            print(f"Error loading translation model {lang_pair}: {e}")
            
            # Text-to-Speech (e.g., Coqui TTS)
            try:
                from TTS.api import TTS
                self.tts_model = TTS("tts_models/en/vctk/vits", gpu=torch.cuda.is_available())
            except Exception as e:
                print(f"Error loading TTS model: {e}")
                self.tts_model = None
                
            print("Local models loaded successfully")
            
        except Exception as e:
            print(f"Error loading local models: {e}")
            # Fallback to API mode
            self.use_local_models = False
            self._init_api_clients()
    
    def _get_device(self):
        """Get the appropriate device (CUDA if available, else CPU)"""
        return "cuda" if torch.cuda.is_available() else "cpu"
            
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
    
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text to the target language"""
        if self.use_local_models:
            # Construct language pair key
            lang_pair = f"{source_lang}-{target_lang}"
            reverse_lang_pair = f"{target_lang}-{source_lang}"
            
            # Check if we have the model for this language pair
            if lang_pair in self.translation_models:
                model = self.translation_models[lang_pair]
                tokenizer = self.translation_tokenizers[lang_pair]
            elif reverse_lang_pair in self.translation_models:
                # Some models like Helsinki-NLP/opus-mt can translate in both directions
                print(f"Using reverse model {reverse_lang_pair} for {source_lang} to {target_lang}")
                model = self.translation_models[reverse_lang_pair]
                tokenizer = self.translation_tokenizers[reverse_lang_pair]
            else:
                print(f"No translation model found for {source_lang} to {target_lang}")
                return text
                
            # Process translation
            try:
                device = self._get_device()
                inputs = tokenizer(text, return_tensors="pt").to(device)
                with torch.no_grad():
                    outputs = model.generate(**inputs, max_length=512)
                translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
                return translated_text
            except Exception as e:
                print(f"Translation error: {e}")
                return text
        else:
            # Use DeepL API
            import requests
            
            try:
                response = requests.post(
                    "https://api.deepl.com/v2/translate",
                    data={
                        "auth_key": self.deepl_api_key,
                        "text": text,
                        "source_lang": source_lang.upper(),
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
        if self.use_local_models and self.tts_model is not None:
            try:
                # Use Coqui TTS
                wav = self.tts_model.tts(text=text, speaker=None, language=target_lang)
                
                # Convert to bytes
                buffer = io.BytesIO()
                import soundfile as sf
                sf.write(buffer, wav, 22050, format='wav')
                buffer.seek(0)
                return buffer.read()
            except Exception as e:
                print(f"TTS error: {e}")
                return b""
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
                
    def detect_language(self, audio_data: np.ndarray) -> str:
        """Detect the language of the audio using Whisper"""
        if self.use_local_models:
            try:
                # Get language by running transcribe with language detection
                result = self.stt_model.transcribe(audio_data, language=None)
                detected_lang = result.get("language", "en")
                return detected_lang
            except Exception as e:
                print(f"Error detecting language: {e}")
                return "en"  # Fallback to English
        else:
            # For API mode, assume English or use detected language if available
            return "en"
            
    def get_available_languages(self) -> List[str]:
        """Get a list of available languages for translation"""
        if self.use_local_models:
            # Extract unique languages from model directories
            languages = set()
            for lang_pair in self.translation_models.keys():
                src, tgt = lang_pair.split('-')
                languages.add(src)
                languages.add(tgt)
            return sorted(list(languages))
        else:
            # Return a standard list for API mode
            return ["en", "es", "fr", "de", "it", "ja", "ko", "zh", "ru", "pt", "ar", "hi"]