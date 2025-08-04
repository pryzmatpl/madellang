#!/usr/bin/env python3
"""
Script to download lightweight translation models for the translation service.
This will download MarianMT models from HuggingFace for common language pairs.
"""

import os
import sys
from pathlib import Path

# Add the deps directory to the Python path and use custom PyTorch
sys.path.insert(0, "./deps")

# Import the custom torch loader first
from torch_loader import get_device_info

# Now import transformers after the custom PyTorch is loaded
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

def download_model(model_name: str, save_dir: str):
    """Download a translation model and save it locally"""
    try:
        print(f"Downloading {model_name}...")
        
        # Download tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.save_pretrained(save_dir)
        
        # Download model
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        model.save_pretrained(save_dir)
        
        print(f"Successfully downloaded {model_name} to {save_dir}")
        return True
        
    except Exception as e:
        print(f"Error downloading {model_name}: {e}")
        return False

def main():
    """Download lightweight translation models for common language pairs"""
    
    # Print PyTorch info
    device_info = get_device_info()
    print(f"Using PyTorch version: {device_info['version']}")
    print(f"CUDA available: {device_info['cuda_available']}")
    if device_info['cuda_available']:
        print(f"Device: {device_info['device_name']}")
    
    # Create models directory
    models_dir = Path("./deps/models")
    models_dir.mkdir(exist_ok=True)
    
    # Define lightweight models for common language pairs
    # Using MarianMT models which are relatively small and fast
    models_to_download = [
        ("Helsinki-NLP/opus-mt-en-de", "en-de"),      # English to German
        ("Helsinki-NLP/opus-mt-de-en", "de-en"),      # German to English
        ("Helsinki-NLP/opus-mt-en-es", "en-es"),      # English to Spanish
        ("Helsinki-NLP/opus-mt-es-en", "es-en"),      # Spanish to English
        ("Helsinki-NLP/opus-mt-en-fr", "en-fr"),      # English to French
        ("Helsinki-NLP/opus-mt-fr-en", "fr-en"),      # French to English
        ("Helsinki-NLP/opus-mt-en-it", "en-it"),      # English to Italian
        ("Helsinki-NLP/opus-mt-it-en", "it-en"),      # Italian to English
        ("Helsinki-NLP/opus-mt-en-pt", "en-pt"),      # English to Portuguese
        ("Helsinki-NLP/opus-mt-pt-en", "pt-en"),      # Portuguese to English
        ("Helsinki-NLP/opus-mt-en-ru", "en-ru"),      # English to Russian
        ("Helsinki-NLP/opus-mt-ru-en", "ru-en"),      # Russian to English
        ("Helsinki-NLP/opus-mt-en-zh", "en-zh"),      # English to Chinese
        ("Helsinki-NLP/opus-mt-zh-en", "zh-en"),      # Chinese to English
        ("Helsinki-NLP/opus-mt-en-ja", "en-ja"),      # English to Japanese
        ("Helsinki-NLP/opus-mt-ja-en", "ja-en"),      # Japanese to English
        ("Helsinki-NLP/opus-mt-en-ko", "en-ko"),      # English to Korean
        ("Helsinki-NLP/opus-mt-ko-en", "ko-en"),      # Korean to English
    ]
    
    print("Starting download of translation models...")
    print(f"Models will be saved to: {models_dir.absolute()}")
    
    successful_downloads = 0
    total_models = len(models_to_download)
    
    for model_name, lang_pair in models_to_download:
        save_dir = models_dir / lang_pair
        
        # Skip if already downloaded
        if save_dir.exists():
            print(f"Model {lang_pair} already exists, skipping...")
            successful_downloads += 1
            continue
        
        if download_model(model_name, str(save_dir)):
            successful_downloads += 1
    
    print(f"\nDownload complete!")
    print(f"Successfully downloaded {successful_downloads}/{total_models} models")
    
    if successful_downloads > 0:
        print(f"\nAvailable language pairs:")
        for model_dir in models_dir.glob("*"):
            if model_dir.is_dir():
                print(f"  - {model_dir.name}")
    
    print(f"\nModels are ready for use in the translation service!")

if __name__ == "__main__":
    main() 