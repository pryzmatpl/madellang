# Nanochat Integration in Madellang Backend

This document describes the integration of nanochat training capabilities directly into the madellang backend using the `backend/deps/nanochat` directory.

## 📁 Directory Structure

```
backend/
├── deps/
│   └── nanochat/                 # Complete nanochat source code
│       ├── nanochat/            # Python package
│       ├── scripts/             # Training scripts
│       ├── rustbpe/             # Rust tokenizer
│       ├── tasks/               # Evaluation tasks
│       ├── tests/               # Test suite
│       ├── pyproject.toml       # Dependencies
│       └── README.md            # Original nanochat docs
├── nanochat_training_service.py # Training service
├── setup_nanochat_deps.sh       # Setup script
├── test_nanochat_integration.py # Integration test
└── Dockerfile.amd               # Updated Docker image
```

## 🚀 Quick Start

### 1. **Setup Nanochat Integration**

```bash
# Run the setup script
cd backend
bash setup_nanochat_deps.sh
```

This script will:
- ✅ Install nanochat in development mode
- ✅ Build the Rust tokenizer
- ✅ Download initial dataset
- ✅ Create script symlinks
- ✅ Set up environment variables

### 2. **Test Integration**

```bash
# Run integration tests
python3 test_nanochat_integration.py
```

### 3. **Start Training**

```bash
# Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Or use Docker
docker-compose up backend
```

## 🔧 **Training Scripts Available**

The integration provides direct access to nanochat training scripts:

| Script | Purpose | Usage |
|--------|---------|-------|
| `nanochat_base_train.py` | Base model training | `python3 nanochat_base_train.py --help` |
| `nanochat_mid_train.py` | Mid training | `python3 nanochat_mid_train.py --help` |
| `nanochat_chat_sft.py` | SFT training | `python3 nanochat_chat_sft.py --help` |
| `nanochat_chat_eval.py` | Model evaluation | `python3 nanochat_chat_eval.py --help` |

## 🐳 **Docker Integration**

The `Dockerfile.amd` has been updated to include nanochat:

### **Build Process**
1. **Install Dependencies**: PyTorch with ROCm support
2. **Setup Nanochat**: Run `setup_nanochat_deps.sh`
3. **Build Rust Tokenizer**: Compile `rustbpe` module
4. **Download Dataset**: Initial dataset shards
5. **Create Symlinks**: Easy access to training scripts

### **Environment Variables**
```bash
NANOCHAT_BASE_DIR="/app/cache/nanochat"
PYTHONPATH="/app:/app/deps/nanochat"
HSA_OVERRIDE_GFX_VERSION="10.3.0"
AMD_SERIALIZE_KERNEL="3"
PYTORCH_HIP_ALLOC_CONF="max_split_size_mb:128"
HIP_VISIBLE_DEVICES="0"
```

## 🧪 **Training Service Integration**

The `NanochatTrainingService` has been updated to use local nanochat:

### **Key Changes**
- ✅ **Local Scripts**: Uses `deps/nanochat/scripts/` instead of external installation
- ✅ **Python Path**: Adds nanochat to `PYTHONPATH`
- ✅ **Environment**: Sets ROCm environment variables
- ✅ **Commands**: Updated to use `python3` and local paths

### **Training Modes**

#### **CPU Demo** (`cpu_demo`)
```python
config = TrainingConfig(
    training_stage="cpu_demo",
    model_depth=4,
    device_batch_size=1,
    num_iterations=50
)
```

#### **Single GPU** (`single_gpu`)
```python
config = TrainingConfig(
    training_stage="single_gpu",
    model_depth=20,
    device_batch_size=16,
    num_iterations=-1  # Auto-calculate
)
```

#### **Full Training** (`full`)
```python
config = TrainingConfig(
    training_stage="full",
    model_depth=32,
    device_batch_size=8,
    num_iterations=-1  # Auto-calculate
)
```

## 📊 **Training Pipeline**

The integrated training follows nanochat's standard pipeline:

1. **Environment Setup**
   - Set ROCm environment variables
   - Check GPU availability
   - Verify Rust and uv installation

2. **Dataset Preparation**
   - Download dataset shards
   - Configure data loading

3. **Tokenizer Training**
   - Train BPE tokenizer
   - Evaluate tokenizer performance

4. **Base Model Training**
   - Train transformer model
   - Monitor loss and metrics

5. **Mid Training** (optional)
   - Continue training with different settings

6. **SFT Training** (optional)
   - Supervised fine-tuning for chat

7. **Evaluation**
   - Run core evaluation tasks
   - Generate performance report

## 🔍 **Monitoring & Logs**

### **Real-time Monitoring**
- **Progress Tracking**: Percentage completion
- **Stage Updates**: Current training stage
- **Metrics**: Loss, accuracy, evaluation scores
- **Logs**: Command output and errors

### **API Endpoints**
- `POST /training/start` - Start training job
- `GET /training/status/{job_id}` - Get progress
- `GET /training/logs/{job_id}` - Get logs
- `POST /training/stop/{job_id}` - Stop job

### **Web UI**
Access the training interface at: `http://localhost:3000/training`

## 🛠️ **Development & Testing**

### **Local Development**
```bash
# Set up environment
source setup_nanochat_env.sh

# Test nanochat import
python3 -c "import nanochat; print('✅ nanochat ready')"

# Test Rust tokenizer
python3 -c "import rustbpe; print('✅ rustbpe ready')"

# Run integration test
python3 test_nanochat_integration.py
```

### **Docker Development**
```bash
# Build image
docker build -f Dockerfile.amd -t madellang-backend .

# Run container
docker run -it --rm madellang-backend bash

# Test inside container
python3 test_nanochat_integration.py
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Import Errors**
```bash
# Check Python path
echo $PYTHONPATH

# Add nanochat to path
export PYTHONPATH="/app/deps/nanochat:$PYTHONPATH"
```

#### **2. Rust Compilation Errors**
```bash
# Check Rust installation
cargo --version

# Reinstall if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env
```

#### **3. GPU Not Detected**
```bash
# Check ROCm installation
rocm-smi

# Check PyTorch GPU support
python3 -c "import torch; print(torch.cuda.is_available())"
```

#### **4. Dataset Download Issues**
```bash
# Check internet connection
curl -I https://huggingface.co

# Manual dataset download
python3 -m nanochat.dataset -n 8
```

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with verbose output
python3 test_nanochat_integration.py
```

## 📈 **Performance Optimization**

### **GPU Training**
- **Batch Size**: Adjust based on GPU memory
- **Sequence Length**: Balance between context and memory
- **Mixed Precision**: Use automatic mixed precision
- **Gradient Accumulation**: For larger effective batch sizes

### **CPU Training**
- **Thread Count**: Set `OMP_NUM_THREADS=1`
- **Small Models**: Use depth=4 for testing
- **Limited Iterations**: Set `num_iterations=50` for demos

### **Memory Management**
- **Cache Directory**: Use `NANOCHAT_BASE_DIR` for data
- **Model Checkpoints**: Regular saving to prevent data loss
- **Cleanup**: Remove old checkpoints and logs

## 🔮 **Future Enhancements**

### **Planned Features**
- **Multi-GPU Support**: Full distributed training
- **Model Serving**: Inference API endpoints
- **Model Hub**: Share trained models
- **Advanced Metrics**: Detailed performance analytics
- **Automated Tuning**: Hyperparameter optimization

### **Integration Opportunities**
- **Weights & Biases**: Enhanced experiment tracking
- **Model Comparison**: A/B testing framework
- **Training Schedules**: Automated training jobs
- **Resource Monitoring**: GPU/CPU usage tracking

## 📚 **Related Documentation**

- [Nanochat Original README](deps/nanochat/README.md)
- [Training Service API](nanochat_training_service.py)
- [Docker Setup](Dockerfile.amd)
- [Frontend Training UI](../frontend/TRAINING_UI_README.md)
- [Dependency Analysis](DEPENDENCY_COMPARISON.md)

## 🎯 **Quick Commands Reference**

```bash
# Setup
bash setup_nanochat_deps.sh

# Test
python3 test_nanochat_integration.py

# Start training (CPU demo)
python3 nanochat_base_train.py --depth=4 --num_iterations=10

# Start backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Check GPU
python3 -c "import torch; print(torch.cuda.is_available())"

# Download dataset
python3 -m nanochat.dataset -n 8

# Build tokenizer
cd deps/nanochat/rustbpe && maturin develop --release
```

The nanochat integration is now fully functional within the madellang backend, providing seamless training capabilities with AMD GPU acceleration!
