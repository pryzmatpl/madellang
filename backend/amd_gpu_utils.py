import os
import sys
import logging
import subprocess
import torch
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
    # Verify PyTorch has ROCm support
    has_rocm = hasattr(torch.version, 'hip') and torch.version.hip is not None
    if not has_rocm:
        logger.warning("PyTorch does not have ROCm support compiled in!")
    
    # Get optimal configuration
    config = get_optimal_config_for_gpu()
    
    # Apply configuration
    for key, value in config.items():
        if key not in os.environ:
            os.environ[key] = value
            logger.info(f"Setting {key}={value}")
        else:
            logger.info(f"Using existing {key}={os.environ[key]}")
    
    # Clear CUDA cache
    try:
        torch.cuda.empty_cache()
        logger.info("GPU memory cache cleared")
    except:
        logger.warning("Failed to clear GPU memory cache")
    
    return config

def is_gpu_compatible():
    """
    Check if the current GPU is compatible with the required operations
    """
    if not torch.cuda.is_available():
        logger.warning("No CUDA/ROCm compatible GPU available")
        return False
    
    try:
        # Test tensor creation and simple operations
        # Use a safer test that's less likely to fail on AMD GPUs
        x = torch.ones((2, 2), device='cpu')
        # First try to move to GPU and do a simple operation
        x_gpu = x.to('cuda')
        y_gpu = x_gpu + x_gpu
        # Move back to CPU to verify the operation worked
        y_cpu = y_gpu.to('cpu')
        
        # Check if the data is as expected (should be tensor of 2's)
        success = torch.all(y_cpu == 2).item()
        
        logger.info(f"GPU compatibility test: {'Passed' if success else 'Failed'}")
        return success
    except Exception as e:
        logger.warning(f"GPU compatibility test failed: {e}")
        return False

def safe_gpu_setup():
    """
    Setup GPU with proper error handling, returning whether GPU is usable
    """
    try:
        configure_gpu_environment()
        compatible = is_gpu_compatible()
        
        if compatible:
            logger.info(f"GPU setup successful: {torch.cuda.get_device_name()}")
            return True
        else:
            logger.warning("GPU not compatible, falling back to CPU")
            return False
    except Exception as e:
        logger.error(f"Error during GPU setup: {e}")
        return False 