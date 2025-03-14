import os
import sys

# Add the custom PyTorch to Python path
custom_pytorch = os.path.abspath(os.path.join(os.path.dirname(__file__), "pytorch"))
if os.path.exists(custom_pytorch):
    sys.path.insert(0, custom_pytorch)

# Now we can safely import torch
import torch

def get_device_info():
    """Returns information about the PyTorch installation and available devices"""
    info = {
        "version": torch.__version__,
        "git_version": getattr(torch, "__git_version__", "Unknown"),
        "rocm_version": getattr(torch, "hip", "Not available"),
        "cuda_available": torch.cuda.is_available(),
        "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "current_device": torch.cuda.current_device() if torch.cuda.is_available() else None,
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() and torch.cuda.device_count() > 0 else "None"
    }
    return info

if __name__ == "__main__":
    # Print PyTorch information when this module is run directly
    info = get_device_info()
    print(f"PyTorch version: {info['version']}")
    print(f"Git version: {info['git_version']}")
    print(f"ROCm version: {info['rocm_version']}")
    print(f"CUDA available: {info['cuda_available']}")
    print(f"Device count: {info['device_count']}")
    print(f"Current device: {info['current_device']}")
    print(f"Device name: {info['device_name']}") 