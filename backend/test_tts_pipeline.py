#!/usr/bin/env python3

import sys
import asyncio
import numpy as np

# Add the deps directory to the Python path
sys.path.insert(0, "./deps")

# Import the custom torch loader to set up paths
from torch_loader import get_device_info

# Import AMD GPU utilities
from amd_gpu_utils import configure_gpu_environment

# Configure GPU environment early in the startup
gpu_config = configure_gpu_environment()

from tts_service import TTSService
from translation_service import TranslationService

async def test_tts_pipeline():
    """Test the complete TTS pipeline"""
    print("Testing TTS Pipeline...")
    
    # Initialize services
    translation_service = TranslationService()
    tts_service = TTSService(use_local_models=False)
    
    print(f"Translation service available: {translation_service is not None}")
    print(f"TTS service available: {tts_service.is_available()}")
    
    # Test text translation
    test_text = "Hello, how are you today?"
    translated = translation_service.translate_text(test_text, "en", "es")
    print(f"Original: {test_text}")
    print(f"Translated: {translated}")
    
    # Test TTS
    audio_data = tts_service.text_to_speech(translated, "es")
    print(f"Generated audio: {len(audio_data)} bytes")
    
    if len(audio_data) > 0:
        print("✅ TTS pipeline working correctly!")
    else:
        print("❌ TTS pipeline failed!")
    
    return len(audio_data) > 0

if __name__ == "__main__":
    result = asyncio.run(test_tts_pipeline())
    sys.exit(0 if result else 1) 