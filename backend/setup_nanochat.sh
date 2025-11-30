#!/bin/bash
set -e

echo "🚀 Setting up Nanochat Training in MadeLang"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if directory exists
dir_exists() {
    [ -d "$1" ]
}

# Function to check if file exists
file_exists() {
    [ -f "$1" ]
}

print_status "Starting Nanochat setup process..."

# Create necessary directories
print_status "Creating necessary directories..."
directories=(
    "/app/cache"
    "/app/cache/nanochat"
    "/app/cache/nanochat/tokenized_data"
    "/app/cache/nanochat/base_checkpoints"
    "/app/cache/nanochat/mid_checkpoints"
    "/app/cache/nanochat/sft_checkpoints"
    "/app/cache/nanochat/reports"
    "/app/models"
    "/app/data"
)

for dir in "${directories[@]}"; do
    if ! dir_exists "$dir"; then
        mkdir -p "$dir"
        print_success "Created directory: $dir"
    else
        print_status "Directory already exists: $dir"
    fi
done

# Set environment variables
print_status "Setting up environment variables..."
export NANOCHAT_BASE_DIR="/app/cache/nanochat"
export OMP_NUM_THREADS=1
export WANDB_RUN=dummy
export PYTHONPATH="/app:/app/nanochat"

print_success "Environment variables set"

# Check Python installation
print_status "Checking Python installation..."
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    print_success "Python found: $PYTHON_VERSION"
else
    print_error "Python3 not found!"
    exit 1
fi

# Check if we're in a virtual environment
if [ -n "$VIRTUAL_ENV" ]; then
    print_success "Virtual environment detected: $VIRTUAL_ENV"
else
    print_warning "No virtual environment detected"
fi

# Install Rust if not already installed
print_status "Checking Rust installation..."
if command_exists cargo; then
    RUST_VERSION=$(cargo --version 2>&1)
    print_success "Rust found: $RUST_VERSION"
else
    print_status "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    
    if command_exists cargo; then
        print_success "Rust installed successfully"
    else
        print_error "Failed to install Rust"
        exit 1
    fi
fi

# Install uv if not already installed
print_status "Checking uv installation..."
if command_exists uv; then
    UV_VERSION=$(uv --version 2>&1)
    print_success "uv found: $UV_VERSION"
else
    print_status "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="/root/.local/bin:${PATH}"
    
    if command_exists uv; then
        print_success "uv installed successfully"
    else
        print_warning "uv installation failed, will use pip instead"
    fi
fi

# Check if nanochat source exists
print_status "Checking nanochat source..."
if dir_exists "/app/nanochat"; then
    print_success "Nanochat source found"
    
    # Check for essential nanochat files
    essential_files=(
        "/app/nanochat/__init__.py"
        "/app/nanochat/gpt.py"
        "/app/nanochat/engine.py"
        "/app/nanochat/tokenizer.py"
        "/app/nanochat/dataloader.py"
        "/app/nanochat/configurator.py"
    )
    
    missing_files=()
    for file in "${essential_files[@]}"; do
        if ! file_exists "$file"; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_success "All essential nanochat files found"
    else
        print_warning "Missing nanochat files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        print_warning "Some nanochat functionality may not work properly"
    fi
else
    print_warning "Nanochat source not found at /app/nanochat"
    print_status "You may need to copy nanochat source files to the container"
fi

# Check if rustbpe exists
print_status "Checking rustbpe tokenizer..."
if dir_exists "/app/rustbpe"; then
    print_success "rustbpe directory found"
    
    # Try to build the tokenizer
    print_status "Building rustbpe tokenizer..."
    if command_exists maturin; then
        cd /app/rustbpe
        if maturin develop --release --manifest-path Cargo.toml; then
            print_success "rustbpe tokenizer built successfully"
        else
            print_warning "Failed to build rustbpe tokenizer"
        fi
        cd /app
    else
        print_warning "maturin not found, cannot build rustbpe tokenizer"
    fi
else
    print_warning "rustbpe directory not found"
    print_status "You may need to copy rustbpe source files to the container"
fi

# Check PyTorch installation
print_status "Checking PyTorch installation..."
if python3 -c "import torch; print(f'PyTorch version: {torch.__version__}')" 2>/dev/null; then
    print_success "PyTorch is installed"
    
    # Check GPU availability
    if python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')" 2>/dev/null; then
        CUDA_AVAILABLE=$(python3 -c "import torch; print(torch.cuda.is_available())" 2>/dev/null)
        if [ "$CUDA_AVAILABLE" = "True" ]; then
            print_success "GPU support detected"
            
            # Check if it's AMD GPU
            if python3 -c "import torch; print(hasattr(torch.version, 'hip') and torch.version.hip)" 2>/dev/null | grep -q "True"; then
                print_success "AMD GPU (ROCm/HIP) support detected"
            else
                print_status "NVIDIA GPU (CUDA) support detected"
            fi
        else
            print_warning "GPU not available, will use CPU training"
        fi
    else
        print_warning "Could not check GPU availability"
    fi
else
    print_error "PyTorch not found!"
    print_status "Please ensure PyTorch is installed in your requirements"
fi

# Check required Python packages
print_status "Checking required Python packages..."
required_packages=(
    "datasets"
    "files-to-prompt"
    "psutil"
    "regex"
    "tiktoken"
    "tokenizers"
    "wandb"
)

missing_packages=()
for package in "${required_packages[@]}"; do
    if python3 -c "import $package" 2>/dev/null; then
        print_success "Package found: $package"
    else
        missing_packages+=("$package")
    fi
done

if [ ${#missing_packages[@]} -eq 0 ]; then
    print_success "All required packages are installed"
else
    print_warning "Missing packages:"
    for package in "${missing_packages[@]}"; do
        echo "  - $package"
    done
    print_status "These packages should be installed via Docker build"
fi

# Test basic functionality
print_status "Testing basic functionality..."

# Test nanochat imports
if python3 -c "import sys; sys.path.append('/app'); import nanochat" 2>/dev/null; then
    print_success "Nanochat module can be imported"
else
    print_warning "Cannot import nanochat module"
fi

# Test training service
if python3 -c "from nanochat_training_service import NanochatTrainingService" 2>/dev/null; then
    print_success "Training service can be imported"
else
    print_warning "Cannot import training service"
fi

# Create a simple test script
print_status "Creating test script..."
cat > /app/test_nanochat_setup.py << 'EOF'
#!/usr/bin/env python3
"""
Test script for nanochat setup
"""

import os
import sys
import torch

def test_environment():
    """Test environment setup"""
    print("Testing environment setup...")
    
    # Check environment variables
    nanochat_dir = os.getenv('NANOCHAT_BASE_DIR')
    if nanochat_dir:
        print(f"✅ NANOCHAT_BASE_DIR: {nanochat_dir}")
    else:
        print("❌ NANOCHAT_BASE_DIR not set")
    
    omp_threads = os.getenv('OMP_NUM_THREADS')
    if omp_threads:
        print(f"✅ OMP_NUM_THREADS: {omp_threads}")
    else:
        print("❌ OMP_NUM_THREADS not set")
    
    # Check PyTorch
    print(f"✅ PyTorch version: {torch.__version__}")
    print(f"✅ CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"✅ GPU count: {torch.cuda.device_count()}")
        print(f"✅ GPU name: {torch.cuda.get_device_name(0)}")
    
    # Check directories
    base_dir = "/app/cache/nanochat"
    if os.path.exists(base_dir):
        print(f"✅ Base directory exists: {base_dir}")
    else:
        print(f"❌ Base directory missing: {base_dir}")

def test_imports():
    """Test imports"""
    print("\nTesting imports...")
    
    try:
        import datasets
        print("✅ datasets imported")
    except ImportError as e:
        print(f"❌ datasets import failed: {e}")
    
    try:
        import tiktoken
        print("✅ tiktoken imported")
    except ImportError as e:
        print(f"❌ tiktoken import failed: {e}")
    
    try:
        import wandb
        print("✅ wandb imported")
    except ImportError as e:
        print(f"❌ wandb import failed: {e}")
    
    try:
        sys.path.append('/app')
        import nanochat
        print("✅ nanochat imported")
    except ImportError as e:
        print(f"❌ nanochat import failed: {e}")
    
    try:
        from nanochat_training_service import NanochatTrainingService
        print("✅ NanochatTrainingService imported")
    except ImportError as e:
        print(f"❌ NanochatTrainingService import failed: {e}")

if __name__ == "__main__":
    test_environment()
    test_imports()
    print("\nSetup test completed!")
EOF

# Run the test script
print_status "Running setup test..."
if python3 /app/test_nanochat_setup.py; then
    print_success "Setup test passed"
else
    print_warning "Setup test had some issues"
fi

# Clean up test script
rm -f /app/test_nanochat_setup.py

# Final status
print_status "Nanochat setup completed!"
print_success "You can now start training with the following API endpoints:"
echo ""
echo "  POST /training/start - Start a training job"
echo "  GET  /training/status/{job_id} - Get training status"
echo "  GET  /training/logs/{job_id} - Get training logs"
echo "  POST /training/stop/{job_id} - Stop a training job"
echo "  GET  /training/jobs - List all training jobs"
echo "  GET  /training/config/templates - Get config templates"
echo ""
print_success "Example usage:"
echo "  curl -X POST http://localhost:8000/training/start \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"training_stage\": \"cpu_demo\", \"num_iterations\": 10}'"
echo ""
print_status "Setup complete! 🎉"
