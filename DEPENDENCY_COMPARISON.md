# Dependency Comparison: Nanochat vs Madellang

## 📊 Overview

This document compares the dependencies between nanochat and madellang to ensure the Dockerfile.amd image has everything needed for both projects.

## 🔍 Dependency Analysis

### **Nanochat Dependencies** (from `pyproject.toml`)

#### Core Dependencies
```toml
dependencies = [
    "datasets>=4.0.0",           # Dataset handling
    "fastapi>=0.117.1",          # Web framework
    "files-to-prompt>=0.6",      # File processing
    "numpy==1.26.4",            # Numerical computing
    "psutil>=7.1.0",            # System monitoring
    "regex>=2025.9.1",          # Regular expressions
    "setuptools>=80.9.0",       # Build tools
    "tiktoken>=0.11.0",         # Tokenization
    "tokenizers>=0.22.0",       # Tokenization
    "torch>=2.8.0",             # Deep learning framework
    "uvicorn>=0.36.0",          # ASGI server
    "wandb>=0.21.3",            # Experiment tracking
]
```

#### Build Dependencies
```toml
build-system = [
    "maturin>=1.7,<2.0"         # Rust-Python bindings
]

dev = [
    "maturin>=1.9.4",           # Rust build tool
    "pytest>=8.0.0",           # Testing framework
]
```

#### PyTorch Sources
- **CPU**: `https://download.pytorch.org/whl/cpu`
- **GPU**: `https://download.pytorch.org/whl/cu128` (CUDA 12.8)

### **Madellang Dependencies** (from `requirements_amd.txt`)

#### Web Framework
```
fastapi>=0.110.0               # Web framework
uvicorn>=0.27.0               # ASGI server
websockets>=12.0              # WebSocket support
pydantic>=2.6.0               # Data validation
```

#### ML/AI Dependencies
```
transformers>=4.38.0           # Hugging Face transformers
numpy>=2.0.0                  # Numerical computing
tqdm>=4.67.0                  # Progress bars
regex>=2023.0.0               # Regular expressions
```

#### Audio Processing
```
soundfile>=0.13.0             # Audio file I/O
librosa>=0.10.1               # Audio analysis
sounddevice>=0.4.6            # Audio device access
```

#### System & Utilities
```
psutil>=5.9.5                 # System monitoring
tiktoken>=0.9.0               # Tokenization
requests>=2.32.0              # HTTP requests
```

#### Testing
```
pytest>=7.4.0                # Testing framework
pytest-asyncio>=0.21.1        # Async testing
```

### **Madellang Locked Dependencies** (from `requirements.txt`)

#### PyTorch Ecosystem
```
torch==2.6.0                  # Deep learning framework
transformers==4.49.0          # Hugging Face transformers
tokenizers==0.21.1            # Tokenization
tiktoken==0.9.0               # OpenAI tokenization
```

#### NVIDIA CUDA Dependencies
```
nvidia-cublas-cu12==12.4.5.8
nvidia-cuda-cupti-cu12==12.4.127
nvidia-cuda-nvrtc-cu12==12.4.127
nvidia-cuda-runtime-cu12==12.4.127
nvidia-cudnn-cu12==9.1.0.70
nvidia-cufft-cu12==11.2.1.3
nvidia-curand-cu12==10.3.5.147
nvidia-cusolver-cu12==11.6.1.9
nvidia-cusparse-cu12==12.3.1.170
nvidia-cusparselt-cu12==0.6.2
nvidia-nccl-cu12==2.21.5
nvidia-nvjitlink-cu12==12.4.127
nvidia-nvtx-cu12==12.4.127
```

#### Audio Processing
```
soundfile==0.13.1             # Audio file I/O
vosk==0.3.50                  # Speech recognition
```

#### Other Dependencies
```
numpy==2.1.3                  # Numerical computing
regex==2024.11.6              # Regular expressions
psutil==7.0.0                 # System monitoring
websockets==15.0.1            # WebSocket support
```

## ⚠️ **Critical Issues Found**

### 1. **PyTorch Version Conflicts**
- **Nanochat**: Requires `torch>=2.8.0`
- **Madellang**: Uses `torch==2.6.0` (locked)
- **Issue**: Version mismatch could cause compatibility issues

### 2. **NumPy Version Conflicts**
- **Nanochat**: Requires `numpy==1.26.4` (pinned)
- **Madellang**: Uses `numpy>=2.0.0` / `numpy==2.1.3`
- **Issue**: Major version difference (1.x vs 2.x)

### 3. **Missing Nanochat Dependencies**
The current Dockerfile.amd is missing several nanochat dependencies:
- `datasets>=4.0.0` ✅ (installed)
- `files-to-prompt>=0.6` ✅ (installed)
- `wandb>=0.21.3` ✅ (installed)
- `maturin>=1.7,<2.0` ❌ (missing - needed for Rust build)
- `setuptools>=80.9.0` ❌ (missing)

### 4. **CUDA vs ROCm Conflict**
- **Madellang**: Uses NVIDIA CUDA dependencies
- **Dockerfile.amd**: Configured for AMD ROCm
- **Issue**: CUDA dependencies won't work with AMD GPUs

## 🔧 **Recommended Fixes**

### 1. **Update Dockerfile.amd Dependencies**

```dockerfile
# Install nanochat-specific dependencies
RUN pip3 install --no-cache-dir \
    datasets>=4.0.0 \
    files-to-prompt>=0.6 \
    psutil>=7.1.0 \
    regex>=2025.9.1 \
    tiktoken>=0.11.0 \
    tokenizers>=0.22.0 \
    wandb>=0.21.3 \
    setuptools>=80.9.0 \
    maturin>=1.7,<2.0
```

### 2. **Resolve PyTorch Version**

**Option A: Upgrade Madellang to PyTorch 2.8+**
```bash
# Update requirements_amd.txt
torch>=2.8.0
```

**Option B: Downgrade Nanochat to PyTorch 2.6**
```toml
# Update nanochat pyproject.toml
"torch>=2.6.0,<2.7.0"
```

### 3. **Resolve NumPy Version**

**Option A: Upgrade Nanochat to NumPy 2.x**
```toml
# Update nanochat pyproject.toml
"numpy>=2.0.0"
```

**Option B: Downgrade Madellang to NumPy 1.x**
```bash
# Update requirements_amd.txt
numpy>=1.26.0,<2.0.0
```

### 4. **Remove CUDA Dependencies for AMD**

Create a new `requirements_amd_clean.txt` without CUDA dependencies:

```bash
# Remove all nvidia-* packages from requirements.txt
# Keep only ROCm-compatible packages
```

### 5. **Add Missing System Dependencies**

```dockerfile
# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    wget \
    git \
    libsndfile1 \
    curl \
    software-properties-common \
    gnupg \
    cmake \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*
```

## 📋 **Updated Dependency Strategy**

### **Unified Requirements File**

Create `requirements_unified.txt`:

```bash
# Web Framework (compatible versions)
fastapi>=0.117.1
uvicorn>=0.36.0
websockets>=12.0
pydantic>=2.6.0

# ML/AI Core
torch>=2.8.0                    # Updated to match nanochat
numpy>=2.0.0                   # Updated to match madellang
transformers>=4.38.0
tqdm>=4.67.0

# Tokenization (compatible versions)
tiktoken>=0.11.0               # Updated to match nanochat
tokenizers>=0.22.0             # Updated to match nanochat

# Audio Processing
soundfile>=0.13.0
librosa>=0.10.1
sounddevice>=0.4.6

# System & Utilities
psutil>=7.1.0                 # Updated to match nanochat
regex>=2025.9.1               # Updated to match nanochat
requests>=2.32.0
setuptools>=80.9.0

# Nanochat Specific
datasets>=4.0.0
files-to-prompt>=0.6
wandb>=0.21.3

# Build Tools
maturin>=1.7,<2.0

# Testing
pytest>=8.0.0                 # Updated to match nanochat
pytest-asyncio>=0.21.1
```

### **PyTorch Installation Strategy**

```dockerfile
# Install PyTorch with ROCm support
RUN pip3 install --no-cache-dir \
    torch>=2.8.0 \
    --index-url https://download.pytorch.org/whl/rocm5.6
```

## 🎯 **Implementation Plan**

### **Phase 1: Immediate Fixes**
1. ✅ Add missing nanochat dependencies to Dockerfile.amd
2. ✅ Install maturin for Rust build support
3. ✅ Add setuptools dependency

### **Phase 2: Version Alignment**
1. 🔄 Resolve PyTorch version conflict (choose 2.8+)
2. 🔄 Resolve NumPy version conflict (choose 2.x)
3. 🔄 Update both projects to use compatible versions

### **Phase 3: Cleanup**
1. 🔄 Remove CUDA dependencies from AMD build
2. 🔄 Create unified requirements file
3. 🔄 Update Dockerfile.amd to use unified requirements

### **Phase 4: Testing**
1. 🔄 Test nanochat training in Docker container
2. 🔄 Test madellang voice translation
3. 🔄 Verify both work together

## 📊 **Compatibility Matrix**

| Component | Nanochat | Madellang | Status | Action |
|-----------|----------|-----------|--------|--------|
| PyTorch | >=2.8.0 | ==2.6.0 | ❌ Conflict | Upgrade Madellang |
| NumPy | ==1.26.4 | >=2.0.0 | ❌ Conflict | Upgrade Nanochat |
| FastAPI | >=0.117.1 | >=0.110.0 | ✅ Compatible | Keep newer |
| Uvicorn | >=0.36.0 | >=0.27.0 | ✅ Compatible | Keep newer |
| Tiktoken | >=0.11.0 | >=0.9.0 | ✅ Compatible | Keep newer |
| Tokenizers | >=0.22.0 | >=0.21.1 | ✅ Compatible | Keep newer |
| Psutil | >=7.1.0 | >=5.9.5 | ✅ Compatible | Keep newer |
| Regex | >=2025.9.1 | >=2023.0.0 | ✅ Compatible | Keep newer |

## 🚀 **Next Steps**

1. **Update Dockerfile.amd** with missing dependencies
2. **Create unified requirements** file
3. **Test compatibility** between both projects
4. **Update documentation** with new dependency requirements
5. **Create migration guide** for existing installations
