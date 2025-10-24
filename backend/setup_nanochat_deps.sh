#!/bin/bash
# Nanochat Setup Script for Madellang Backend Integration
# Sets up nanochat in backend/deps/nanochat for training

set -e

echo "🚀 Setting up nanochat for madellang backend integration..."

# Get the script directory and set paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NANOCHAT_DIR="$SCRIPT_DIR/deps/nanochat"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 Script directory: $SCRIPT_DIR"
echo "📁 Nanochat directory: $NANOCHAT_DIR"
echo "📁 Backend directory: $BACKEND_DIR"

# Check if nanochat directory exists
if [ ! -d "$NANOCHAT_DIR" ]; then
    echo "❌ Error: nanochat directory not found at $NANOCHAT_DIR"
    echo "Please ensure nanochat is copied to backend/deps/nanochat"
    exit 1
fi

cd "$NANOCHAT_DIR"

# Check if we're in a Docker container
if [ -f /.dockerenv ]; then
    echo "📦 Running in Docker container"
    DOCKER_MODE=true
else
    echo "🖥️  Running on host system"
    DOCKER_MODE=false
fi

# Check Python version
echo "🐍 Checking Python version..."
python3 --version

# Check if Rust is available
echo "🦀 Checking Rust installation..."
if command -v cargo &> /dev/null; then
    echo "✅ Rust is available"
    cargo --version
else
    echo "❌ Rust not found - installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
    echo "✅ Rust installed"
fi

# Check if uv is available
echo "📦 Checking uv installation..."
if command -v uv &> /dev/null; then
    echo "✅ uv is available"
    uv --version
else
    echo "❌ uv not found - installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    echo "✅ uv installed"
fi

# Set up Python environment
echo "🐍 Setting up Python environment..."
if [ "$DOCKER_MODE" = true ]; then
    # In Docker, use system Python
    PYTHON_CMD="python3"
    PIP_CMD="pip3"
else
    # On host, create virtual environment
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    PYTHON_CMD="python"
    PIP_CMD="pip"
fi

# Install nanochat dependencies
echo "📥 Installing nanochat dependencies..."

# Check if PyTorch is available with ROCm
echo "🔥 Checking PyTorch installation..."
$PYTHON_CMD -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'Device count: {torch.cuda.device_count()}')
    print(f'Current device: {torch.cuda.current_device()}')
    print(f'Device name: {torch.cuda.get_device_name(0)}')
"

# Install nanochat in development mode
echo "🔧 Installing nanochat in development mode..."
if [ "$DOCKER_MODE" = true ]; then
    # In Docker, install directly
    pip3 install -e .
else
    # On host, use uv for better dependency management
    uv sync --extra gpu
fi

# Build Rust tokenizer
echo "🦀 Building Rust tokenizer..."
if [ -d "rustbpe" ]; then
    cd rustbpe
    if [ "$DOCKER_MODE" = true ]; then
        maturin develop --release --manifest-path Cargo.toml
    else
        uv run maturin develop --release --manifest-path Cargo.toml
    fi
    cd ..
    echo "✅ Rust tokenizer built"
else
    echo "❌ rustbpe directory not found"
    exit 1
fi

# Download initial dataset
echo "📊 Downloading initial dataset..."
if [ "$DOCKER_MODE" = true ]; then
    python3 -m nanochat.dataset -n 8
else
    uv run python -m nanochat.dataset -n 8
fi

# Test nanochat installation
echo "🧪 Testing nanochat installation..."
if [ "$DOCKER_MODE" = true ]; then
    python3 -c "
import nanochat
print('✅ nanochat module imported successfully')
print(f'nanochat version: {nanochat.__version__ if hasattr(nanochat, \"__version__\") else \"unknown\"}')
"
else
    uv run python -c "
import nanochat
print('✅ nanochat module imported successfully')
print(f'nanochat version: {nanochat.__version__ if hasattr(nanochat, \"__version__\") else \"unknown\"}')
"
fi

# Create symlink to scripts in backend directory for easy access
echo "🔗 Creating script symlinks..."
cd "$BACKEND_DIR"

# Create symlinks to nanochat scripts
for script in base_train.py mid_train.py chat_sft.py chat_eval.py; do
    if [ -f "deps/nanochat/scripts/$script" ]; then
        ln -sf "deps/nanochat/scripts/$script" "nanochat_$script"
        echo "✅ Created symlink: nanochat_$script"
    fi
done

# Create a simple test script
echo "📝 Creating test script..."
cat > test_nanochat_integration.py << 'EOF'
#!/usr/bin/env python3
"""
Test script for nanochat integration in madellang backend
"""

import sys
import os

# Add nanochat to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'deps', 'nanochat'))

def test_nanochat_import():
    """Test if nanochat can be imported"""
    try:
        import nanochat
        print("✅ nanochat imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import nanochat: {e}")
        return False

def test_rust_tokenizer():
    """Test if Rust tokenizer is available"""
    try:
        import rustbpe
        print("✅ Rust tokenizer imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import rustbpe: {e}")
        return False

def test_torch_availability():
    """Test PyTorch availability"""
    try:
        import torch
        print(f"✅ PyTorch {torch.__version__} available")
        print(f"   CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   Device count: {torch.cuda.device_count()}")
        return True
    except ImportError as e:
        print(f"❌ PyTorch not available: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing nanochat integration...")
    print("=" * 50)
    
    tests = [
        test_nanochat_import,
        test_rust_tokenizer,
        test_torch_availability,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Nanochat integration is ready.")
        return 0
    else:
        print("❌ Some tests failed. Please check the setup.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
EOF

chmod +x test_nanochat_integration.py
echo "✅ Created test script: test_nanochat_integration.py"

# Create environment setup script
echo "📝 Creating environment setup script..."
cat > setup_nanochat_env.sh << 'EOF'
#!/bin/bash
# Environment setup for nanochat integration

export NANOCHAT_BASE_DIR="/app/cache/nanochat"
export OMP_NUM_THREADS=1
export WANDB_RUN=dummy

# Add nanochat to Python path
export PYTHONPATH="/app/deps/nanochat:$PYTHONPATH"

# Set ROCm environment variables
export HSA_OVERRIDE_GFX_VERSION=10.3.0
export AMD_SERIALIZE_KERNEL=3
export PYTORCH_HIP_ALLOC_CONF=max_split_size_mb:128
export HIP_VISIBLE_DEVICES=0

echo "✅ Nanochat environment variables set"
echo "   NANOCHAT_BASE_DIR: $NANOCHAT_BASE_DIR"
echo "   PYTHONPATH: $PYTHONPATH"
EOF

chmod +x setup_nanochat_env.sh
echo "✅ Created environment setup script: setup_nanochat_env.sh"

echo ""
echo "🎉 Nanochat setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the integration: python3 test_nanochat_integration.py"
echo "2. Set environment: source setup_nanochat_env.sh"
echo "3. Run a quick training test: python3 nanochat_base_train.py --help"
echo ""
echo "📁 Files created:"
echo "   - test_nanochat_integration.py (test script)"
echo "   - setup_nanochat_env.sh (environment setup)"
echo "   - nanochat_*.py (script symlinks)"
echo ""
echo "🔧 Available training scripts:"
echo "   - nanochat_base_train.py (base training)"
echo "   - nanochat_mid_train.py (mid training)"
echo "   - nanochat_chat_sft.py (SFT training)"
echo "   - nanochat_chat_eval.py (evaluation)"
