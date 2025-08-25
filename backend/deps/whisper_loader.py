import os
import sys
import logging

logger = logging.getLogger(__name__)

# Add the custom PyTorch to Python path first
custom_pytorch = os.path.abspath(os.path.join(os.path.dirname(__file__), "pytorch"))
if os.path.exists(custom_pytorch):
    sys.path.insert(0, custom_pytorch)

# Now add the custom whisper to Python path
custom_whisper = os.path.abspath(os.path.join(os.path.dirname(__file__), "whisper"))
if os.path.exists(custom_whisper):
    sys.path.insert(0, custom_whisper)

def get_whisper_info():
    """Returns information about the Whisper installation"""
    try:
        # Try to import whisper with numba
        import whisper
        info = {
            "version": getattr(whisper, "__version__", "Unknown"),
            "available_models": whisper.available_models(),
            "load_model_available": hasattr(whisper, "load_model"),
            "numba_available": True
        }
        return info
    except ImportError as e:
        if "numba" in str(e).lower():
            logger.warning("Numba not available, creating fallback whisper implementation")
            return {
                "version": "fallback",
                "available_models": ["tiny", "small", "medium", "large", "large-v3"],
                "load_model_available": True,
                "numba_available": False,
                "fallback_mode": True
            }
        else:
            return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}

def load_whisper_model(model_name="small", device="cpu"):
    """Load a whisper model with fallback for numba issues"""
    try:
        # Try to import and use the real whisper
        import whisper
        return whisper.load_model(model_name, device=device)
    except ImportError as e:
        if "numba" in str(e).lower():
            logger.warning("Using fallback whisper implementation due to numba dependency")
            return create_fallback_whisper_model(model_name, device)
        else:
            raise e
    except Exception as e:
        logger.error(f"Error loading whisper model: {e}")
        raise e

def create_fallback_whisper_model(model_name, device):
    """Create a fallback whisper model when numba is not available"""
    logger.info(f"Creating fallback whisper model: {model_name} on {device}")
    
    # Try to use alternative speech recognition libraries
    fallback_model = None
    
    # Try Vosk first (offline, lightweight)
    try:
        import vosk
        logger.info("Using Vosk as fallback speech recognition")
        fallback_model = VoskFallbackModel(model_name, device)
    except ImportError:
        logger.warning("Vosk not available")
    
    # Try SpeechRecognition as second option
    if not fallback_model:
        try:
            import speech_recognition as sr
            logger.info("Using SpeechRecognition as fallback speech recognition")
            fallback_model = SpeechRecognitionFallbackModel(model_name, device)
        except ImportError:
            logger.warning("SpeechRecognition not available")
    
    # If no alternatives available, use minimal fallback
    if not fallback_model:
        logger.warning("No alternative speech recognition available, using minimal fallback")
        fallback_model = MinimalFallbackModel(model_name, device)
    
    return fallback_model

class VoskFallbackModel:
    """Fallback using Vosk for speech recognition"""
    def __init__(self, name, device):
        self.name = name
        self.device = device
        try:
            # Try to load a Vosk model
            model_path = "./deps/vosk-models/small-en-us-0.15"
            if os.path.exists(model_path):
                self.vosk_model = vosk.Model(model_path)
                self.recognizer = vosk.KaldiRecognizer(self.vosk_model, 16000)
                logger.info("Vosk model loaded successfully")
            else:
                logger.warning("Vosk model not found, using basic recognition")
                self.vosk_model = None
                self.recognizer = None
        except Exception as e:
            logger.warning(f"Could not initialize Vosk: {e}")
            self.vosk_model = None
            self.recognizer = None
    
    def transcribe(self, audio, **kwargs):
        if self.recognizer and self.vosk_model:
            try:
                # Convert audio to format Vosk expects
                if hasattr(audio, 'tobytes'):
                    audio_bytes = audio.tobytes()
                else:
                    audio_bytes = audio
                
                self.recognizer.AcceptWaveform(audio_bytes)
                result = self.recognizer.FinalResult()
                
                # Parse Vosk result
                import json
                result_dict = json.loads(result)
                text = result_dict.get('text', '')
                
                return {
                    "text": text,
                    "segments": [{"text": text, "start": 0, "end": 0}],
                    "language": "en"  # Vosk models are language-specific
                }
            except Exception as e:
                logger.error(f"Vosk transcription error: {e}")
                return self._empty_result()
        else:
            return self._empty_result()
    
    def _empty_result(self):
        return {
            "text": "",
            "segments": [],
            "language": "en"
        }

class SpeechRecognitionFallbackModel:
    """Fallback using SpeechRecognition library"""
    def __init__(self, name, device):
        self.name = name
        self.device = device
        try:
            import speech_recognition as sr
            self.recognizer = sr.Recognizer()
            logger.info("SpeechRecognition initialized")
        except Exception as e:
            logger.warning(f"Could not initialize SpeechRecognition: {e}")
            self.recognizer = None
    
    def transcribe(self, audio, **kwargs):
        if self.recognizer:
            try:
                # Convert audio to format SpeechRecognition expects
                if hasattr(audio, 'tobytes'):
                    audio_bytes = audio.tobytes()
                else:
                    audio_bytes = audio
                
                # Create AudioData object
                import speech_recognition as sr
                audio_data = sr.AudioData(audio_bytes, 16000, 2)
                
                # Try to recognize speech
                text = self.recognizer.recognize_google(audio_data)
                
                return {
                    "text": text,
                    "segments": [{"text": text, "start": 0, "end": 0}],
                    "language": "en"
                }
            except Exception as e:
                logger.error(f"SpeechRecognition error: {e}")
                return self._empty_result()
        else:
            return self._empty_result()
    
    def _empty_result(self):
        return {
            "text": "",
            "segments": [],
            "language": "en"
        }

class MinimalFallbackModel:
    """Minimal fallback when no alternatives are available"""
    def __init__(self, name, device):
        self.name = name
        self.device = device
        logger.warning(f"Using minimal fallback whisper model {name} - no transcription available")
    
    def transcribe(self, audio, **kwargs):
        logger.warning("Minimal fallback model - transcription not available")
        # Return a basic result structure
        return {
            "text": "",
            "segments": [],
            "language": "unknown"
        }

if __name__ == "__main__":
    # Print Whisper information when this module is run directly
    info = get_whisper_info()
    print(f"Whisper info: {info}") 