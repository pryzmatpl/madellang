#!/usr/bin/env python3
import sys
sys.path.insert(0, "./deps/pytorch")

try:
    import torch
    print(f"PyTorch version: {torch.__version__}")
    
    # Check if CUDA (ROCm) is available
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    # Check ROCm support
    if hasattr(torch.backends, 'hip'):
        print(f"ROCm support built: {torch.backends.hip.is_built()}")
    else:
        print("ROCm support not available in this build")
    
    # Device information
    if torch.cuda.is_available():
        print(f"Device count: {torch.cuda.device_count()}")
        print(f"Current device: {torch.cuda.current_device()}")
        print(f"Device name: {torch.cuda.get_device_name(0)}")
        
        # Test tensor creation on GPU
        print("Creating a test tensor on GPU...")
        x = torch.zeros(5, 5, device='cuda')
        print(f"Tensor device: {x.device}")
        print("GPU test successful!")
    else:
        print("No GPU available for testing")
        
    # From the docs/source/notes/hip.rst:
    cuda = torch.device('cuda')     # Default HIP device
    cuda0 = torch.device('cuda:0')  # 'rocm' or 'hip' are not valid, use 'cuda'
        
except Exception as e:
    print(f"Error: {e}")
    print("GPU test failed!") 

model = whisper.load_model("turbo") 