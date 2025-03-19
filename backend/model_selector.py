import torch
import os
import logging

logger = logging.getLogger(__name__)

def select_appropriate_whisper_model():
    """
    Select an appropriate Whisper model size based on available GPU memory
    and environment configuration.
    """
    # Check if model is explicitly specified via environment variable
    if "WHISPER_MODEL" in os.environ:
        model_name = os.environ["WHISPER_MODEL"]
        logger.info(f"Using model specified in environment: {model_name}")
        return model_name
    
    # Check if we're on CPU
    if not torch.cuda.is_available():
        logger.info("No GPU available, using 'tiny' model")
        return "tiny"
    
    # If we're running on an AMD GPU with HIP, be conservative
    if hasattr(torch.version, 'hip') and torch.version.hip is not None:
        try:
            # Try to get GPU memory
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # GB
            
            # AMD GPUs often need more headroom, so be conservative
            if gpu_memory > 16:
                model_name = "small"  # Use small instead of medium for stability
            elif gpu_memory > 8:
                model_name = "small"
            else:
                model_name = "tiny"
                
            logger.info(f"AMD GPU with {gpu_memory:.1f} GB, selected model: {model_name}")
            return model_name
        except Exception as e:
            logger.warning(f"Error getting GPU properties: {e}, falling back to tiny model")
            return "tiny"
    
    # NVIDIA GPU - can be a bit more aggressive with model sizes
    try:
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # GB
        
        if gpu_memory > 16:
            model_name = "large"
        elif gpu_memory > 10:
            model_name = "medium"
        elif gpu_memory > 5:
            model_name = "small"
        else:
            model_name = "tiny"
            
        logger.info(f"NVIDIA GPU with {gpu_memory:.1f} GB, selected model: {model_name}")
        return model_name
    except Exception as e:
        logger.warning(f"Error getting GPU properties: {e}, falling back to tiny model")
        return "tiny" 