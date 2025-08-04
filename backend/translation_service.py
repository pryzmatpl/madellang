import sys
# Add the deps directory to the Python path
sys.path.insert(0, "./deps")

import logging
from whisper_loader import get_whisper_info
import whisper
from torch_loader import get_device_info
import torch
import numpy as np
from typing import Optional, Dict, Any
import time

logger = logging.getLogger(__name__)

# Import the model manager for text translation
from model_manager import ModelManager

def safe_gpu_setup():
    """Safely set up GPU environment with AMD-specific configurations"""
    try:
        # Check if CUDA is available
        if torch.cuda.is_available():
            # For AMD GPUs, we need to be more careful
            if hasattr(torch.version, 'hip'):
                logger.info("AMD GPU detected with HIP support")
                # AMD GPUs might have compatibility issues with some models
                return True
            else:
                logger.info("NVIDIA GPU detected")
                return True
        else:
            logger.info("No GPU detected, using CPU")
            return False
    except Exception as e:
        logger.error(f"Error in GPU setup: {e}")
        return False

def select_appropriate_whisper_model():
    """Select appropriate Whisper model based on available resources"""
    try:
        if torch.cuda.is_available():
            # Check available GPU memory
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
            if gpu_memory >= 8:
                return "large-v3"
            elif gpu_memory >= 4:
                return "medium"
            else:
                return "small"
        else:
            # For CPU, use smaller models
            return "tiny"
    except Exception as e:
        logger.error(f"Error selecting Whisper model: {e}")
        return "tiny"

class TranslationService:
    def __init__(self):
        """Initialize the translation service using Whisper for STT and ModelManager for translation"""
        # Set up GPU environment with AMD-specific configurations
        gpu_available = safe_gpu_setup()
        
        # For AMD GPUs, start with CPU to avoid HIP compatibility issues
        if gpu_available and hasattr(torch.version, 'hip'):
            logger.info("AMD GPU detected, starting with CPU to avoid HIP compatibility issues")
            self.device = "cpu"
            self.gpu_available = False  # We'll keep GPU as fallback but start with CPU
        elif gpu_available:
            self.device = "cuda"
            self.gpu_available = True
            logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
        else:
            self.device = "cpu"
            self.gpu_available = False
            logger.info("Using CPU for inference")
        
        # Store the initial device for fallback
        self.initial_device = self.device
        
        # Select appropriate model size
        model_name = select_appropriate_whisper_model()
        logger.info(f"Loading Whisper model '{model_name}' for transcription on {self.device}")
        
        # Attempt to load the model with error handling
        try:
            # Load model on the initial device
            self.model = whisper.load_model(model_name, device=self.device)
            logger.info(f"Successfully loaded {model_name} model on {self.device}")
            
        except Exception as e:
            logger.error(f"Error loading {model_name} model on {self.device}: {e}")
            # Try fallback to CPU if GPU loading failed
            if self.device == "cuda":
                logger.info("Attempting fallback to CPU")
                self.device = "cpu"
                try:
                    self.model = whisper.load_model(model_name, device="cpu")
                    logger.info(f"Successfully loaded {model_name} model on CPU")
                except Exception as cpu_e:
                    logger.error(f"Error loading model on CPU: {cpu_e}")
                    # Try tiny model as last resort
                    if model_name != "tiny":
                        logger.info("Attempting fallback to tiny model on CPU")
                        self.model = whisper.load_model("tiny", device="cpu")
                        logger.info("Successfully loaded tiny model on CPU")
                    else:
                        raise cpu_e
            else:
                # Re-raise if we're already trying the smallest model
                raise
                
        # Languages Whisper can handle - ensure we load this correctly
        self.supported_languages = {}
        try:
            self.supported_languages = whisper.tokenizer.LANGUAGES
            logger.info(f"Loaded {len(self.supported_languages)} supported languages")
        except Exception as e:
            logger.error(f"Error loading language list: {e}")
            
        # Initialize the model manager for text translation
        self.model_manager = ModelManager()
        logger.info("Model manager initialized for text translation")
    
    def switch_to_device(self, device: str):
        """Switch the model to a different device"""
        if device != self.device:
            logger.info(f"Switching model from {self.device} to {device}")
            try:
                self.model = self.model.to(device)
                self.device = device
                logger.info(f"Successfully switched to {device}")
                return True
            except Exception as e:
                logger.error(f"Failed to switch to {device}: {e}")
                return False
        return True
        
    def transcribe_and_translate(self, audio_data, source_lang: Optional[str] = None, target_lang: str = "en") -> Dict:
        """
        Transcribe audio and translate it to the target language using Whisper for STT and ModelManager for translation
        
        Args:
            audio_data: Audio data as numpy array
            source_lang: Source language code (optional, will detect if not provided)
            target_lang: Target language code (default: "en")
            
        Returns:
            Dict with original text, detected language, and translated text
        """
        logger.info(f"Transcribing audio with source_lang={source_lang}, target_lang={target_lang}")
        
        # Ensure audio data is writable and properly formatted
        try:
            # Make sure audio data is writable and in the right format
            if hasattr(audio_data, 'flags'):
                try:
                    audio_data.flags.writeable = True
                except ValueError:
                    # If the array is read-only, create a writable copy
                    audio_data = audio_data.copy()
            
            # Normalize audio to float32 if needed
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
                
            # Ensure audio is in the expected range [-1, 1]
            if audio_data.max() > 1.0 or audio_data.min() < -1.0:
                audio_data = np.clip(audio_data, -1.0, 1.0)
                
        except Exception as e:
            logger.error(f"Error preparing audio data: {e}")
            return {
                "original_text": "",
                "translated_text": "",
                "detected_language": source_lang or "en",
                "error": f"Audio preparation error: {e}"
            }
        
        # Try different devices if needed
        devices_to_try = [self.device]
        if self.gpu_available and self.device == "cpu":
            devices_to_try.append("cuda")
        elif self.device == "cuda":
            devices_to_try.append("cpu")
            
        for device in devices_to_try:
            try:
                logger.info(f"Attempting transcription on {device}")
                
                # Switch to device if needed
                if device != self.device:
                    if not self.switch_to_device(device):
                        continue
                
                # Transcribe with Whisper
                if source_lang:
                    # Use specified source language
                    result = self.model.transcribe(
                        audio_data,
                        language=source_lang,
                        task="transcribe"
                    )
                else:
                    # Let Whisper detect the language
                    result = self.model.transcribe(
                        audio_data,
                        task="transcribe"
                    )
                
                original_text = result["text"].strip()
                detected_lang = result["language"]
                
                logger.info(f"Detected language: {detected_lang}, original text: {original_text[:50]}...")
                
                # Skip if no text was transcribed
                if not original_text:
                    return {
                        "original_text": "",
                        "translated_text": "",
                        "detected_language": detected_lang,
                        "error": "No speech detected"
                    }
                
                # Use ModelManager for text translation
                translated_text = self.model_manager.translate_text(
                    original_text, 
                    detected_lang, 
                    target_lang
                )
                
                logger.info(f"Translation completed: {original_text[:30]}... -> {translated_text[:30]}...")
                
                return {
                    "original_text": original_text,
                    "translated_text": translated_text,
                    "detected_language": detected_lang,
                    "error": None
                }
                
            except Exception as e:
                error_msg = f"Error on {device}: {e}"
                logger.error(error_msg)
                
                # If this is the last device to try, return error
                if device == devices_to_try[-1]:
                    return {
                        "original_text": "",
                        "translated_text": "",
                        "detected_language": source_lang or "en",
                        "error": error_msg
                    }
                else:
                    # For other errors on GPU, try CPU
                    continue
        
        # If we get here, all devices failed
        return {
            "original_text": "",
            "translated_text": "",
            "detected_language": source_lang or "en",
            "error": "All device attempts failed"
        }
    
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text from source language to target language using ModelManager
        """
        logger.info(f"Translating text from {source_lang} to {target_lang}")
        
        # Validate language codes
        if source_lang not in self.supported_languages:
            logger.warning(f"Source language {source_lang} not found in supported languages. Using 'en' instead.")
            source_lang = "en"
            
        if target_lang not in self.supported_languages:
            logger.warning(f"Target language {target_lang} not found in supported languages. Using 'en' instead.")
            target_lang = "en"
        
        # If languages are the same, no translation needed
        if source_lang == target_lang:
            return text
            
        try:
            # Use ModelManager for text translation
            return self.model_manager.translate_text(text, source_lang, target_lang)
                
        except Exception as e:
            logger.error(f"Error in text translation: {e}")
            return text  # Fallback to original text
            
    def get_available_languages(self) -> Dict[str, str]:
        """Get dictionary of available languages for translation"""
        return self.supported_languages 