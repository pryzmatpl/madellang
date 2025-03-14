import torch
import os

def select_appropriate_whisper_model():
    """Select a Whisper model size appropriate for the available GPU memory"""
    
    # If a specific model is requested via environment variable, use that
    if "WHISPER_MODEL" in os.environ:
        return os.environ["WHISPER_MODEL"]
    
    # Check if GPU is available
    if not torch.cuda.is_available():
        return "tiny"  # Use tiny model for CPU
        
    # Get GPU memory in GB
    try:
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        
        # Choose model based on available memory
        if gpu_memory > 16:
            return "large"
        elif gpu_memory > 10:
            return "medium"
        elif gpu_memory > 5:
            return "small"
        else:
            return "tiny"
    except Exception as e:
        print(f"Error detecting GPU memory: {e}. Defaulting to tiny model.")
        return "tiny" 