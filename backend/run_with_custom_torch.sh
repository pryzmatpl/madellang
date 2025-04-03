#!/bin/bash
# Activate virtual environment
source venv/bin/activate

# Set environment variables for AMD GPU
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export PYTORCH_HIP_ALLOC_CONF=max_split_size_mb:128
export AMD_SERIALIZE_KERNEL=1
export TORCH_ROCM_AOTRITON_ENABLE_EXPERIMENTAL=1
export HIP_VISIBLE_DEVICES=0
export WHISPER_MODEL=medium
export FLASH_ATTENTION_TRITON_AMD_ENABLE=TRUE

# Set the library path to find ROCm libraries
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/rocm/lib

# Add custom PyTorch to Python path
export PYTHONPATH=$(pwd)/deps/pytorch:$PYTHONPATH

# Clear GPU memory cache
python -c "import torch; torch.cuda.empty_cache() if torch.cuda.is_available() else None"

# Run the server with optimized WebSocket settings
uvicorn main:app --host 0.0.0.0 --port 8000 --ws-ping-interval 20 --ws-ping-timeout 30 --timeout-keep-alive 60 