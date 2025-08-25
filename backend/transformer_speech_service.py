import logging
import numpy as np
from typing import Optional, Dict, Any, List
import time
import torch
from transformers import pipeline, AutoFeatureExtractor, AutoTokenizer, AutoModelForCTC

logger = logging.getLogger(__name__)

class TransformerSpeechService:
    """
    Speech recognition service using transformers pipeline instead of whisper.
    This approach is NumPy 2.x compatible and doesn't depend on numba.
    """
    
    def __init__(self, model_name: str = "facebook/wav2vec2-base-960h"):
        """
        Initialize the speech recognition service with a transformers model.
        
        Args:
            model_name: HuggingFace model name for speech recognition
        """
        self.model_name = model_name
        self.device = self._get_device()
        self.pipeline = None
        self.feature_extractor = None
        self.tokenizer = None
        self.model = None
        
        # Initialize the model
        self._init_model()
        
        # Supported languages (these models are typically English-focused)
        self.supported_languages = {
            "en": "English",
            "de": "German", 
            "fr": "French",
            "es": "Spanish",
            "it": "Italian",
            "pt": "Portuguese",
            "nl": "Dutch",
            "pl": "Polish",
            "ru": "Russian"
        }
        
        logger.info(f"TransformerSpeechService initialized with {model_name} on {self.device}")
    
    def _get_device(self) -> str:
        """Get the appropriate device for processing"""
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch, 'hip') and torch.hip.is_available():
            return "cuda"  # ROCm uses CUDA API
        else:
            return "cpu"
    
    def _init_model(self):
        """Initialize the transformers model and pipeline"""
        try:
            logger.info(f"Loading speech recognition model: {self.model_name}")
            
            # Load components
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name)
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCTC.from_pretrained(self.model_name)
            
            # Move to device
            self.model = self.model.to(self.device)
            
            # Create pipeline
            self.pipeline = pipeline(
                "automatic-speech-recognition",
                model=self.model,
                tokenizer=self.tokenizer,
                feature_extractor=self.feature_extractor,
                device=0 if self.device == "cuda" else -1
            )
            
            logger.info(f"Model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Fallback to CPU if GPU fails
            if self.device == "cuda":
                logger.info("Falling back to CPU")
                self.device = "cpu"
                self._init_model()
            else:
                raise e
    
    def transcribe(self, audio_data: np.ndarray, source_lang: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Transcribe audio using the transformers pipeline.
        
        Args:
            audio_data: Audio data as numpy array
            source_lang: Source language (optional, for compatibility with whisper API)
            **kwargs: Additional arguments
            
        Returns:
            Dictionary with transcription results
        """
        try:
            start_time = time.time()
            
            # Ensure audio is in the right format
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Normalize audio if needed
            if np.max(np.abs(audio_data)) > 1.0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # Run transcription
            result = self.pipeline(
                audio_data,
                sampling_rate=16000,  # Most models expect 16kHz
                return_timestamps=True,
                **kwargs
            )
            
            # Format result to match whisper API
            transcription_result = {
                "text": result.get("text", ""),
                "segments": [],
                "language": source_lang or "en"  # Default to English
            }
            
            # Add segments if available
            if "chunks" in result:
                for chunk in result["chunks"]:
                    transcription_result["segments"].append({
                        "text": chunk.get("text", ""),
                        "start": chunk.get("timestamp", [0, 0])[0],
                        "end": chunk.get("timestamp", [0, 0])[1]
                    })
            
            processing_time = time.time() - start_time
            logger.info(f"Transcription completed in {processing_time:.2f}s")
            
            return transcription_result
            
        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            return {
                "text": "",
                "segments": [],
                "language": source_lang or "en",
                "error": str(e)
            }
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get supported languages"""
        return self.supported_languages.copy()
    
    def is_available(self) -> bool:
        """Check if the service is available"""
        return self.pipeline is not None and self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_name": self.model_name,
            "device": self.device,
            "available": self.is_available(),
            "supported_languages": list(self.supported_languages.keys())
        } 