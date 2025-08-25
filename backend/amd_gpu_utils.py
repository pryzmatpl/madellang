import os
import sys
import logging
import subprocess
import re

logger = logging.getLogger(__name__)

def detect_amd_gpu_arch():
    """
    Detect AMD GPU architecture (gfx version) using rocminfo
    """
    try:
        # Run rocminfo and capture the output
        result = subprocess.run(["rocminfo"], stdout=subprocess.PIPE, text=True)
        output = result.stdout
        
        # Look for the gfx pattern in the output
        match = re.search(r"gfx\d+", output)
        if match:
            return match.group(0)
        
        # Fallback for RX 7900 XTX if not found
        logger.warning("Could not determine GPU architecture from rocminfo, using default for RX 7900 XTX")
        return "gfx1100"  # Default for RX 7900 XTX
    except Exception as e:
        logger.warning(f"Error detecting GPU architecture: {e}, using default")
        return "gfx1100"  # Default for RX 7900 XTX

def get_optimal_config_for_gpu():
    """
    Get optimal configuration for the detected AMD GPU
    """
    gpu_arch = detect_amd_gpu_arch()
    
    # Map GPU architectures to appropriate HSA versions and memory configurations
    gpu_configs = {
        "gfx1100": {  # RX 7900 XTX (RDNA 3)
            "HSA_OVERRIDE_GFX_VERSION": "11.0.0",
            "PYTORCH_HIP_ALLOC_CONF": "max_split_size_mb:128",
            "AMD_SERIALIZE_KERNEL": "1",  # Boolean flag, should be 0 or 1, not 3
            "TORCH_ROCM_AOTRITON_ENABLE_EXPERIMENTAL": "1",
            "HIP_VISIBLE_DEVICES": "0",
            "WHISPER_MODEL": "tiny",  # Use tiny model for RDNA3 to avoid compatibility issues
            "FLASH_ATTENTION_TRITON_AMD_ENABLE": "TRUE"
        },
        "gfx90a": {  # MI200 series
            "HSA_OVERRIDE_GFX_VERSION": "9.0.0",
            "PYTORCH_HIP_ALLOC_CONF": "max_split_size_mb:256",
            "AMD_SERIALIZE_KERNEL": "1",
            "HIP_VISIBLE_DEVICES": "0",
            "WHISPER_MODEL": "small"
        },
        "gfx942": {  # MI300 series
            "HSA_OVERRIDE_GFX_VERSION": "9.4.2",
            "PYTORCH_HIP_ALLOC_CONF": "max_split_size_mb:256",
            "AMD_SERIALIZE_KERNEL": "1",
            "HIP_VISIBLE_DEVICES": "0",
            "WHISPER_MODEL": "small"
        }
    }
    
    # Get the config for detected GPU or use a reasonable default
    config = gpu_configs.get(gpu_arch, gpu_configs["gfx1100"])
    
    logger.info(f"Detected GPU architecture: {gpu_arch}, using optimized configuration")
    return config

def configure_gpu_environment():
    """
    Set up environment variables for AMD GPU
    """
    # Import torch only when needed to avoid early import issues
    try:
        import torch
        
        # Verify PyTorch has ROCm support
        has_rocm = hasattr(torch.version, 'hip') and torch.version.hip is not None
        if not has_rocm:
            logger.warning("PyTorch does not have ROCm support compiled in!")
        
        # Clear CUDA cache
        try:
            torch.cuda.empty_cache()
            logger.info("GPU memory cache cleared")
        except:
            logger.warning("Failed to clear GPU memory cache")
            
    except ImportError as e:
        logger.warning(f"PyTorch not available: {e}")
        has_rocm = False
    
    # Get optimal configuration
    config = get_optimal_config_for_gpu()
    
    # Apply configuration
    for key, value in config.items():
        if key not in os.environ:
            os.environ[key] = value
            logger.info(f"Setting {key}={value}")
        else:
            logger.info(f"Using existing {key}={os.environ[key]}")
    
    return config

def is_gpu_compatible():
    """
    Check if the current environment supports AMD GPU operations
    """
    try:
        import torch
        has_rocm = hasattr(torch.version, 'hip') and torch.version.hip is not None
        return has_rocm
    except ImportError:
        return False

def get_gpu_memory_info():
    """
    Get GPU memory information if available
    """
    try:
        import torch
        if torch.cuda.is_available():
            return {
                'total': torch.cuda.get_device_properties(0).total_memory,
                'allocated': torch.cuda.memory_allocated(0),
                'cached': torch.cuda.memory_reserved(0)
            }
        else:
            return None
    except ImportError:
        return None

def clear_gpu_memory():
    """
    Clear GPU memory cache if available
    """
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            logger.info("GPU memory cache cleared")
            return True
        else:
            return False
    except ImportError:
        return False 