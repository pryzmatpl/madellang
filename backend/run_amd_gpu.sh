#!/bin/bash
set -e

echo "🚀 Starting MadeLang with AMD GPU Optimizations"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# AMD ROCm Optimizations
echo "⚙️ Setting AMD ROCm optimizations..."

# Get GPU architecture version
GPU_ARCH=$(rocminfo | grep -m 1 -oP "gfx\d+" || echo "unknown")
echo "🖥️ Detected GPU architecture: $GPU_ARCH"

# Set environment variables for ROCm
export HSA_OVERRIDE_GFX_VERSION=${GPU_ARCH/gfx/}
echo "👉 Setting HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION"

# Memory optimization
export PYTORCH_HIP_ALLOC_CONF="max_split_size_mb:256"
echo "👉 Setting PYTORCH_HIP_ALLOC_CONF=$PYTORCH_HIP_ALLOC_CONF"

# Use specific GPU (usually 0 is the first one)
export HIP_VISIBLE_DEVICES=0
echo "👉 Setting HIP_VISIBLE_DEVICES=$HIP_VISIBLE_DEVICES"

# AMD kernel serialization (helps with stability)
export AMD_SERIALIZE_KERNEL=1
echo "👉 Setting AMD_SERIALIZE_KERNEL=$AMD_SERIALIZE_KERNEL"

# Force smaller Whisper model for stability
export WHISPER_MODEL="small"
echo "👉 Setting WHISPER_MODEL=$WHISPER_MODEL"

# Clear GPU cache
echo "🧹 Clearing GPU memory cache..."
python -c "import torch; torch.cuda.empty_cache()" 2>/dev/null || echo "⚠️ Failed to clear GPU cache"

echo "🔍 Checking PyTorch installation..."
python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'ROCm support: {hasattr(torch.version, \"hip\")}'); print(f'GPU available: {torch.cuda.is_available()}'); print(f'GPU name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')" || echo "⚠️ PyTorch check failed"

# Run the server with production settings
echo "🌐 Starting web server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 