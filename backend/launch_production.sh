#!/bin/bash
set -e  # Exit on error

# Include the verification script
./verify_environment.py
if [ $? -ne 0 ]; then
    echo "❌ Environment verification failed. Please fix the issues above."
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set environment variables for ROCm
export HSA_OVERRIDE_GFX_VERSION=11.0.0  # Change to match your GPU
export PYTORCH_HIP_ALLOC_CONF="max_split_size_mb:512"
export HIP_VISIBLE_DEVICES=0  # Use first GPU

# Use smaller Whisper model for stability
export WHISPER_MODEL="small"

# Set the library path to find ROCm libraries
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/rocm/lib

# Add custom PyTorch to Python path
export PYTHONPATH=$(pwd)/deps/pytorch:$PYTHONPATH

# Run the server with production settings
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --no-access-log 