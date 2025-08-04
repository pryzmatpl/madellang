import sys
# Add the deps directory to the Python path
sys.path.insert(0, "./deps")

import whisper
import torch
from typing import Dict, List, Optional
from model_selector import select_appropriate_whisper_model
import logging
from amd_gpu_utils import safe_gpu_setup
import numpy as np

logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        """Initialize the translation service using Whisper"""
        # Set up GPU environment with AMD-specific configurations
        gpu_available = safe_gpu_setup()
        
        # Determine device based on GPU compatibility check
        if gpu_available:
            self.device = "cuda"
            logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
        else:
            self.device = "cpu"
            logger.info("Using CPU for inference")
        
        # Store the initial device for fallback
        self.initial_device = self.device
        
        # Select appropriate model size
        model_name = select_appropriate_whisper_model()
        logger.info(f"Loading Whisper model '{model_name}' for translation on {self.device}")
        
        # Attempt to load the model with error handling
        try:
            # For AMD GPUs, we need to make sure we load the model with proper settings
            if self.device == "cuda" and hasattr(torch.version, 'hip'):
                # Use smaller model if we're on AMD GPU for better stability
                logger.info("Loading model with AMD-specific optimizations")
                self.model = whisper.load_model(model_name, device=self.device)
            else:
                self.model = whisper.load_model(model_name, device=self.device)
            
            logger.info(f"Successfully loaded {model_name} model")
            
            # Skip the warmup step for now since it's causing issues
            # We'll handle language detection properly when needed
            
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
        Transcribe audio and translate it to the target language using Whisper
        
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
                audio_data.flags.writeable = True
            audio_data = np.asarray(audio_data, dtype=np.float32)
            
            # Check for invalid audio data
            if np.isnan(audio_data).any() or np.isinf(audio_data).any():
                logger.error("Audio data contains NaN or infinite values")
                return {
                    "original_text": "",
                    "translated_text": "",
                    "detected_language": source_lang or "en",
                    "error": "Invalid audio data (NaN or infinite values)"
                }
                
            # Normalize audio if needed
            if np.max(np.abs(audio_data)) > 1.0:
                audio_data = audio_data / np.max(np.abs(audio_data))
                
        except Exception as e:
            logger.error(f"Error preprocessing audio data: {e}")
            return {
                "original_text": "",
                "translated_text": "",
                "detected_language": source_lang or "en",
                "error": f"Audio preprocessing failed: {str(e)}"
            }
        
        # Determine the task based on target language
        task = "translate" if target_lang == "en" else "transcribe"
        
        # Try GPU first, then fallback to CPU if needed
        devices_to_try = [self.device]
        if self.device == "cuda":
            devices_to_try.append("cpu")
        
        for device in devices_to_try:
            try:
                logger.info(f"Attempting transcription on {device}")
                
                # Move model to the target device if needed
                if device != self.device:
                    if not self.switch_to_device(device):
                        logger.error(f"Failed to switch to {device}, skipping")
                        continue
                
                # Validate language codes first
                if source_lang and source_lang not in self.supported_languages:
                    logger.warning(f"Source language {source_lang} not found in supported languages. Using auto-detection instead.")
                    source_lang = None
                    
                if target_lang not in self.supported_languages:
                    logger.warning(f"Target language {target_lang} not found in supported languages. Falling back to English.")
                    target_lang = "en"
                
                # First transcribe to get original text and detect language
                transcription_options = {"task": "transcribe"}
                if source_lang:
                    transcription_options["language"] = source_lang
                    
                transcription_result = self.model.transcribe(
                    audio_data, 
                    **transcription_options
                )
                
                original_text = transcription_result["text"]
                detected_lang = transcription_result.get("language", "en")
                
                logger.info(f"Detected language: {detected_lang}, original text: {original_text[:50]}...")
                
                # If target is the same as source, no translation needed
                if detected_lang == target_lang:
                    logger.info("Source and target languages match, no translation needed")
                    return {
                        "original_text": original_text,
                        "translated_text": original_text,
                        "detected_language": detected_lang
                    }
                
                # For non-English target languages, we need to use a workaround
                if target_lang != "en":
                    # First translate to English if source isn't English
                    if detected_lang != "en":
                        english_result = self.model.transcribe(
                            audio_data,
                            language=detected_lang,
                            task="translate"
                        )
                        english_text = english_result["text"]
                        logger.info(f"Translated to English: {english_text[:50]}...")
                    else:
                        english_text = original_text
                        
                    # Now use prompt-based approach to get the model to translate to target language
                    target_result = self._prompt_translate(english_text, target_lang)
                    translated_text = target_result
                else:
                    # Direct translation to English
                    translation_result = self.model.transcribe(
                        audio_data,
                        language=detected_lang,
                        task="translate"
                    )
                    translated_text = translation_result["text"]
                    logger.info(f"Translated text: {translated_text[:50]}...")
                
                return {
                    "original_text": original_text,
                    "translated_text": translated_text,
                    "detected_language": detected_lang
                }
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error in transcribe_and_translate on {device}: {error_msg}")
                
                # If this is a HIP error and we haven't tried CPU yet, continue to CPU
                if "HIP error" in error_msg and device == "cuda" and "cpu" in devices_to_try:
                    logger.info("HIP error detected, will try CPU fallback")
                    continue
                elif "nan" in error_msg.lower() or "invalid values" in error_msg.lower():
                    logger.error(f"NaN/Invalid values detected on {device}, this suggests model corruption")
                    # Try to reload the model on CPU as a last resort
                    if device == "cuda" and "cpu" in devices_to_try:
                        logger.info("Attempting to reload model on CPU due to NaN errors")
                        try:
                            # Reload the model on CPU
                            model_name = "tiny"  # Use the smallest model for stability
                            self.model = whisper.load_model(model_name, device="cpu")
                            self.device = "cpu"
                            logger.info("Successfully reloaded model on CPU")
                            continue
                        except Exception as reload_e:
                            logger.error(f"Failed to reload model: {reload_e}")
                            return {
                                "original_text": "",
                                "translated_text": "",
                                "detected_language": source_lang or "en",
                                "error": f"Model corruption detected: {error_msg}"
                            }
                    else:
                        return {
                            "original_text": "",
                            "translated_text": "",
                            "detected_language": source_lang or "en",
                            "error": f"Model corruption on {device}: {error_msg}"
                        }
                elif device == "cpu":
                    # If CPU also failed, return error
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
    
    def _prompt_translate(self, text: str, target_lang: str) -> str:
        """
        Use Whisper's text capabilities to translate text to a target language
        by using clever prompting
        """
        try:
            # Get the full language name for clearer instructions
            language_name = self.supported_languages.get(target_lang, "Unknown")
            
            # Create a prompt that instructs translation
            prompt = f"Translate the following text to {language_name}: {text}"
            logger.info(f"Using translation prompt to {language_name}")
            
            # Use proper audio format that the model expects - create a dummy spectrogram
            # Instead of creating a raw audio tensor, we'll use the log mel spectrogram format
            # that Whisper expects
            
            # Create a properly formatted options object
            options = whisper.DecodingOptions(
                prompt=prompt,
                language=target_lang,
                without_timestamps=True,
            )
            
            # For prompt-based approaches, we'll use the model's encode/decode functions directly
            # Use a different approach that doesn't rely on dummy audio
            encodings = self.model.tokenizer.encode(prompt)
            prompt_ids = torch.tensor([encodings.ids]).to(self.device)
            
            # Generate a translation using the prompt
            result = self.model.decode(prompt_ids, options)
            translation = result.text
            
            # Clean up the translation - remove the prompt if it appears
            if prompt in translation:
                translation = translation.replace(prompt, "").strip()
                
            return translation
        except Exception as e:
            logger.error(f"Error in prompt translation: {e}")
            return text  # Fallback to original text
            
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text from source language to target language
        This is a simpler method that doesn't require audio input
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
            # For translation to English, we can use Whisper's capabilities directly
            if target_lang == "en":
                return self._prompt_translate(text, target_lang)
            else:
                # For non-English targets, translate to English first if needed
                if source_lang != "en":
                    english_text = self._prompt_translate(text, "en")
                else:
                    english_text = text
                    
                # Then translate from English to target language
                return self._prompt_translate(english_text, target_lang)
                
        except Exception as e:
            logger.error(f"Error in text translation: {e}")
            return text  # Fallback to original text
            
    def get_available_languages(self) -> Dict[str, str]:
        """Get dictionary of available languages for translation"""
        return self.supported_languages 