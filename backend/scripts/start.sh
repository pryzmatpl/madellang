#!/bin/bash

# Activate conda environment
source /opt/conda/etc/profile.d/conda.sh
conda activate py_3.10

# Set environment variables
export PATH="/opt/rocm/bin:${PATH}"
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export AMD_SERIALIZE_KERNEL=1
export PYTORCH_HIP_ALLOC_CONF=max_split_size_mb:128
export HIP_VISIBLE_DEVICES=0
export WHISPER_MODEL=small

# Debug: Show environment info
echo "=== Environment Information ==="
echo "Python version: $(python --version)"
echo "Pip version: $(pip --version)"
echo "NumPy version: $(python -c 'import numpy; print(numpy.__version__)' 2>/dev/null || echo 'NumPy not available')"
echo "PyTorch version: $(python -c 'import torch; print(torch.__version__)' 2>/dev/null || echo 'PyTorch not available')"
echo "Conda environment: $CONDA_DEFAULT_ENV"
echo "================================"

# Run the application
exec uvicorn main:app --host 0.0.0.0 --port 8000 