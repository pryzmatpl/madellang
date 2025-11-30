#!/bin/bash
# PyTorch Installation Script for AMD ROCm
# This script installs PyTorch with ROCm support for both nanochat and madellang

set -e

echo "🔧 Installing PyTorch with ROCm support..."

# Check if we're in a Docker container
if [ -f /.dockerenv ]; then
    echo "📦 Running in Docker container"
    DOCKER_MODE=true
else
    echo "🖥️  Running on host system"
    DOCKER_MODE=false
fi

# Check ROCm installation
if command -v rocm-smi &> /dev/null; then
    echo "✅ ROCm detected"
    rocm-smi --showproductname
else
    echo "⚠️  ROCm not detected - will install CPU-only PyTorch"
fi

# Install PyTorch with ROCm support
echo "📥 Installing PyTorch with ROCm support..."

if [ "$DOCKER_MODE" = true ]; then
    # Docker installation
    pip3 install --no-cache-dir torch>=2.8.0 --index-url https://download.pytorch.org/whl/rocm5.6
else
    # Host installation
    pip install torch>=2.8.0 --index-url https://download.pytorch.org/whl/rocm5.6
fi

# Verify PyTorch installation
echo "🧪 Testing PyTorch installation..."
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'ROCm available: {torch.cuda.is_available() and torch.version.hip is not None}')
if torch.cuda.is_available():
    print(f'Device count: {torch.cuda.device_count()}')
    print(f'Current device: {torch.cuda.current_device()}')
    print(f'Device name: {torch.cuda.get_device_name(0)}')
"

echo "✅ PyTorch installation complete!"

# Install additional dependencies
echo "📦 Installing additional dependencies..."

if [ "$DOCKER_MODE" = true ]; then
    pip3 install --no-cache-dir \
        numpy>=2.0.0 \
        transformers>=4.38.0 \
        datasets>=4.0.0 \
        tiktoken>=0.11.0 \
        tokenizers>=0.22.0 \
        wandb>=0.21.3 \
        fastapi>=0.117.1 \
        uvicorn>=0.36.0
else
    pip install \
        numpy>=2.0.0 \
        transformers>=4.38.0 \
        datasets>=4.0.0 \
        tiktoken>=0.11.0 \
        tokenizers>=0.22.0 \
        wandb>=0.21.3 \
        fastapi>=0.117.1 \
        uvicorn>=0.36.0
fi

echo "🎉 All dependencies installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test nanochat training: python -m nanochat.dataset -n 8"
echo "2. Test madellang backend: uvicorn main:app --host 0.0.0.0 --port 8000"
echo "3. Check GPU availability: python -c 'import torch; print(torch.cuda.is_available())'"
