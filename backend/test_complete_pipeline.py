#!/usr/bin/env python3

import sys
import asyncio
import numpy as np
import wave
import io

# Add the deps directory to the Python path
sys.path.insert(0, "./deps")

# Import the custom torch loader to set up paths
from torch_loader import get_device_info

# Import AMD GPU utilities
from amd_gpu_utils import configure_gpu_environment

# Configure GPU environment early in the startup
gpu_config = configure_gpu_environment()

from audio_processor import AudioProcessor
from model_manager import ModelManager
from translation_service import TranslationService
from tts_service import TTSService

def create_test_audio():
    """Create a simple test audio signal"""
    # Create a simple sine wave
    sample_rate = 44100
    duration = 2.0  # 2 seconds
    frequency = 440.0  # A4 note
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio = np.sin(2 * np.pi * frequency * t)
    
    # Keep as float32 for Whisper
    audio = audio.astype(np.float32)
    
    # Convert to bytes
    return audio.tobytes()

async def test_complete_pipeline():
    """Test the complete audio processing pipeline"""
    print("Testing Complete Audio Processing Pipeline...")
    
    # Initialize services
    translation_service = TranslationService()
    model_manager = ModelManager()
    tts_service = TTSService(use_local_models=False)
    audio_processor = AudioProcessor(model_manager, translation_service, tts_service)
    
    print(f"Translation service available: {translation_service is not None}")
    print(f"Model manager available: {model_manager is not None}")
    print(f"TTS service available: {tts_service.is_available()}")
    print(f"Audio processor available: {audio_processor is not None}")
    
    # Create test audio
    test_audio = create_test_audio()
    print(f"Created test audio: {len(test_audio)} bytes")
    
    # Test audio processing
    try:
        # Convert float32 to int16 for the audio processor
        audio_np = np.frombuffer(test_audio, dtype=np.float32)
        audio_int16 = (audio_np * 32767).astype(np.int16)
        test_audio_int16 = audio_int16.tobytes()
        
        result = await audio_processor.process_audio(test_audio_int16, "es")
        print(f"Audio processing result: {len(result)} bytes")
        
        if len(result) > 0:
            print("✅ Complete pipeline working correctly!")
            return True
        else:
            print("❌ Audio processing returned empty result")
            return False
            
    except Exception as e:
        print(f"❌ Error in audio processing: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_complete_pipeline())
    sys.exit(0 if result else 1) 