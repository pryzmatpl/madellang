# Nanochat Training Integration Plan for MadeLang

## Overview

This document outlines the plan to integrate nanochat training capabilities into the MadeLang backend infrastructure. The goal is to leverage MadeLang's existing AMD GPU setup and Docker infrastructure to enable nanochat model training locally.

## Current State Analysis

### MadeLang Backend Infrastructure
- **AMD GPU Support**: ROCm 5.4 with proper environment variables
- **Docker Setup**: Multi-stage build with ROCm libraries
- **FastAPI Backend**: WebSocket support for real-time communication
- **Volume Mounts**: `/models` and `/data` directories for persistent storage
- **Environment**: Ubuntu 22.04 base with Python 3.x

### Nanochat Requirements
- **Dependencies**: PyTorch with CUDA/HIP support, transformers, datasets, wandb
- **Rust Component**: Custom BPE tokenizer (`rustbpe`) requiring Rust/Cargo
- **Training Pipeline**: Multi-stage training (tokenizer → base → mid → SFT → RL)
- **Data Requirements**: Large datasets (~24GB for full training)
- **Compute**: Designed for 8xH100 nodes, but supports CPU/single GPU

## Integration Strategy

### Phase 1: Environment Preparation

#### 1.1 Update Dockerfile.amd
```dockerfile
# Add nanochat-specific dependencies
RUN pip3 install --no-cache-dir \
    datasets>=4.0.0 \
    files-to-prompt>=0.6 \
    psutil>=7.1.0 \
    regex>=2025.9.1 \
    tiktoken>=0.11.0 \
    tokenizers>=0.22.0 \
    wandb>=0.21.3

# Install Rust for tokenizer compilation
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install uv for dependency management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"
```

#### 1.2 Add Nanochat Volume Mounts
```yaml
# In docker-compose.yml
volumes:
  - ./models:/app/models
  - ./data:/app/data
  - ./nanochat:/app/nanochat  # Add nanochat source
  - ./cache:/app/cache        # Add cache directory
```

### Phase 2: Training Service Integration

#### 2.1 Create Training Service Module
```python
# backend/nanochat_training_service.py
class NanochatTrainingService:
    def __init__(self):
        self.training_status = {}
        self.active_jobs = {}
    
    async def start_training(self, config: TrainingConfig):
        # Start training job in background
        pass
    
    async def get_training_status(self, job_id: str):
        # Return current training progress
        pass
    
    async def stop_training(self, job_id: str):
        # Gracefully stop training
        pass
```

#### 2.2 Add Training Endpoints
```python
# In main.py
@app.post("/training/start")
async def start_training(request: TrainingRequest):
    # Start nanochat training with specified config
    pass

@app.get("/training/status/{job_id}")
async def get_training_status(job_id: str):
    # Return training progress
    pass

@app.post("/training/stop/{job_id}")
async def stop_training(job_id: str):
    # Stop training job
    pass
```

### Phase 3: Configuration Management

#### 3.1 Training Configuration
```python
# backend/training_config.py
class TrainingConfig(BaseModel):
    model_depth: int = 20
    device_batch_size: int = 32
    max_seq_len: int = 2048
    num_iterations: int = -1
    target_param_data_ratio: int = 20
    wandb_run: str = "dummy"
    training_stage: str = "full"  # full, base_only, cpu_demo
```

#### 3.2 Environment Variables
```bash
# Add to Dockerfile.amd
ENV NANOCHAT_BASE_DIR="/app/cache/nanochat"
ENV OMP_NUM_THREADS=1
ENV WANDB_RUN=dummy
```

### Phase 4: Training Pipeline Implementation

#### 4.1 Training Stages
1. **Environment Setup**: Install dependencies, setup Rust
2. **Tokenizer Training**: Download data, train BPE tokenizer
3. **Base Training**: Pretrain the transformer model
4. **Mid Training**: Add conversation capabilities
5. **SFT Training**: Supervised fine-tuning
6. **Evaluation**: Test model performance

#### 4.2 Background Job Management
```python
# Use asyncio for non-blocking training
import asyncio
import subprocess

async def run_training_command(command: List[str]):
    process = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    return process
```

### Phase 5: Web Interface Integration

#### 5.1 Training Dashboard
- Real-time training progress
- Loss curves and metrics
- Model sampling output
- Training logs

#### 5.2 Model Management
- List trained models
- Download model checkpoints
- Switch between models for inference

## Implementation Steps

### Step 1: Update Docker Infrastructure
1. Modify `Dockerfile.amd` to include nanochat dependencies
2. Update `docker-compose.yml` with additional volume mounts
3. Test Docker build and container startup

### Step 2: Create Training Service
1. Implement `NanochatTrainingService` class
2. Add training endpoints to FastAPI
3. Create background job management system

### Step 3: Integrate Training Scripts
1. Copy nanochat source code to container
2. Adapt training scripts for containerized environment
3. Implement configuration management

### Step 4: Add Web Interface
1. Create training dashboard component
2. Add real-time progress updates
3. Implement model management interface

### Step 5: Testing and Optimization
1. Test CPU-only training pipeline
2. Test single GPU training
3. Optimize memory usage and performance

## Configuration Options

### Training Modes

#### CPU Demo Mode (for testing)
```bash
python -m scripts.base_train \
    --depth=4 \
    --max_seq_len=1024 \
    --device_batch_size=1 \
    --total_batch_size=1024 \
    --num_iterations=50
```

#### Single GPU Mode
```bash
python -m scripts.base_train \
    --depth=20 \
    --device_batch_size=16 \
    --total_batch_size=524288
```

#### Full Training Mode
```bash
torchrun --standalone --nproc_per_node=8 \
    -m scripts.base_train \
    --depth=20 \
    --device_batch_size=32
```

## Resource Requirements

### Minimum Requirements
- **CPU**: 4+ cores
- **RAM**: 16GB+
- **Storage**: 50GB+ (for datasets and models)
- **GPU**: AMD GPU with ROCm support (optional)

### Recommended Requirements
- **CPU**: 8+ cores
- **RAM**: 32GB+
- **Storage**: 100GB+ SSD
- **GPU**: AMD GPU with 8GB+ VRAM

## Security Considerations

1. **Container Isolation**: Training runs in isolated container
2. **Resource Limits**: Set memory and CPU limits
3. **Network Access**: Limit external network access during training
4. **Data Privacy**: Ensure training data remains local

## Monitoring and Logging

1. **Training Metrics**: Loss, learning rate, throughput
2. **System Metrics**: GPU utilization, memory usage
3. **Error Handling**: Graceful failure and recovery
4. **Log Management**: Structured logging with rotation

## Future Enhancements

1. **Distributed Training**: Multi-node training support
2. **Model Serving**: Integrate trained models into chat interface
3. **Custom Datasets**: Support for user-provided training data
4. **Hyperparameter Tuning**: Automated hyperparameter optimization
5. **Model Compression**: Quantization and pruning support

## Testing Strategy

### Unit Tests
- Training service functionality
- Configuration validation
- Error handling

### Integration Tests
- End-to-end training pipeline
- WebSocket communication
- Docker container functionality

### Performance Tests
- Memory usage optimization
- Training speed benchmarks
- Concurrent training jobs

## Rollback Plan

1. **Configuration Backup**: Save original Docker configuration
2. **Service Isolation**: Keep training service separate from main app
3. **Feature Flags**: Enable/disable training features
4. **Monitoring**: Track system stability during rollout

## Success Metrics

1. **Training Completion**: Successfully train nanochat models
2. **Performance**: Match or exceed standalone nanochat performance
3. **Usability**: Intuitive web interface for training management
4. **Reliability**: Stable training without crashes
5. **Resource Efficiency**: Optimal use of available hardware

This integration plan provides a comprehensive roadmap for adding nanochat training capabilities to the MadeLang backend while maintaining the existing functionality and ensuring system stability.
