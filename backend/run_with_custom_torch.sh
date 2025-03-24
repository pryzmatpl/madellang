#!/bin/bash
# Activate virtual environment
source venv/bin/activate

# Set environment variables for ROCm
export HSA_OVERRIDE_GFX_VERSION=11.0.0  # Set to your GPU architecture version
export PYTORCH_HIP_ALLOC_CONF="max_split_size_mb:512"
export HIP_VISIBLE_DEVICES=0  # Use first GPU
export TORCH_USE_HIP_DSA=1

# Set the library path to find ROCm libraries
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/rocm/lib

# Add custom PyTorch to Python path
export PYTHONPATH=$(pwd)/deps/pytorch:$PYTHONPATH
export AMD_SERIALIZE_KERNEL=1
export PYTORCH_HIP_ALLOC_CONF="max_split_size_mb:128"
export WHISPER_MODEL="medium"  # Force smaller model

# Clear GPU memory cache
python -c "import torch; torch.cuda.empty_cache()" || true

# Run the server with a single worker to avoid GPU memory issues
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --workers 1 