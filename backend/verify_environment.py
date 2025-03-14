#!/usr/bin/env python3
import os
import sys

def verify_environment():
    """Verify that the environment is correctly set up"""
    issues = []
    
    # Check if PyTorch is installed with ROCm support
    try:
        sys.path.insert(0, "./deps/pytorch")
        import torch
        if not (hasattr(torch.version, 'hip') and torch.version.hip is not None):
            issues.append("PyTorch is not built with ROCm/HIP support")
    except ImportError:
        issues.append("PyTorch is not installed in deps/pytorch")
        
    # Check for Whisper
    try:
        sys.path.append("./deps/whisper")
        import whisper
    except ImportError:
        issues.append("Whisper is not installed in deps/whisper")
        
    # Check ROCm environment
    if not os.environ.get("HSA_OVERRIDE_GFX_VERSION"):
        issues.append("HSA_OVERRIDE_GFX_VERSION environment variable is not set")
        
    # Return issues
    return issues

if __name__ == "__main__":
    issues = verify_environment()
    if issues:
        print("⚠️ Environment issues detected:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
        print("\nPlease run ./build_torch_rocm.sh to set up the environment")
        sys.exit(1)
    else:
        print("✅ Environment is correctly set up!")
        sys.exit(0) 