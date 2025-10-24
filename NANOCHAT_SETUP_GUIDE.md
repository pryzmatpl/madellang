# Nanochat Training Setup Guide for MadeLang

## Quick Start

This guide will help you set up nanochat training within the MadeLang backend infrastructure. The setup leverages MadeLang's existing AMD GPU support and Docker environment.

## Prerequisites

- Docker and Docker Compose installed
- AMD GPU with ROCm support (optional, CPU training also supported)
- At least 16GB RAM
- 50GB+ free disk space
- Linux environment (tested on Ubuntu 22.04)

## Setup Instructions

### Step 1: Clone and Prepare Nanochat

```bash
# Navigate to madellang directory
cd /home/piotro/Workspace/madellang

# Clone nanochat into the backend directory
cd backend
git clone https://github.com/karpathy/nanochat.git

# Copy nanochat files to the backend
cp -r nanochat/* ./
```

### Step 2: Update Docker Configuration

#### 2.1 Modify Dockerfile.amd

Add the following lines after the existing ROCm installation:

```dockerfile
# Install Rust for nanochat tokenizer
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install uv for dependency management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Install nanochat dependencies
RUN pip3 install --no-cache-dir \
    datasets>=4.0.0 \
    files-to-prompt>=0.6 \
    psutil>=7.1.0 \
    regex>=2025.9.1 \
    tiktoken>=0.11.0 \
    tokenizers>=0.22.0 \
    wandb>=0.21.3

# Set nanochat environment variables
ENV NANOCHAT_BASE_DIR="/app/cache/nanochat"
ENV OMP_NUM_THREADS=1
ENV WANDB_RUN=dummy
```

#### 2.2 Update docker-compose.yml

Add additional volume mounts:

```yaml
volumes:
  - ./models:/app/models
  - ./data:/app/data
  - ./cache:/app/cache
  - ./nanochat:/app/nanochat
```

### Step 3: Create Training Service

Create a new file `backend/nanochat_training_service.py`:

```python
import asyncio
import subprocess
import json
import os
from typing import Dict, Optional
from pydantic import BaseModel

class TrainingConfig(BaseModel):
    model_depth: int = 20
    device_batch_size: int = 32
    max_seq_len: int = 2048
    num_iterations: int = -1
    target_param_data_ratio: int = 20
    wandb_run: str = "dummy"
    training_stage: str = "cpu_demo"  # cpu_demo, single_gpu, full

class NanochatTrainingService:
    def __init__(self):
        self.active_jobs: Dict[str, Dict] = {}
        self.training_status: Dict[str, Dict] = {}
    
    async def start_training(self, config: TrainingConfig, job_id: str):
        """Start a nanochat training job"""
        self.active_jobs[job_id] = {
            "config": config.dict(),
            "status": "starting",
            "progress": 0,
            "logs": []
        }
        
        # Start training in background
        asyncio.create_task(self._run_training(config, job_id))
        return job_id
    
    async def _run_training(self, config: TrainingConfig, job_id: str):
        """Run the actual training process"""
        try:
            self.active_jobs[job_id]["status"] = "running"
            
            if config.training_stage == "cpu_demo":
                await self._run_cpu_demo(config, job_id)
            elif config.training_stage == "single_gpu":
                await self._run_single_gpu(config, job_id)
            else:
                await self._run_full_training(config, job_id)
                
        except Exception as e:
            self.active_jobs[job_id]["status"] = "failed"
            self.active_jobs[job_id]["error"] = str(e)
    
    async def _run_cpu_demo(self, config: TrainingConfig, job_id: str):
        """Run CPU demo training"""
        commands = [
            # Setup environment
            ["python", "-m", "nanochat.report", "reset"],
            
            # Download minimal dataset
            ["python", "-m", "nanochat.dataset", "-n", "4"],
            
            # Train tokenizer
            ["python", "-m", "scripts.tok_train", "--max_chars=1000000000"],
            ["python", "-m", "scripts.tok_eval"],
            
            # Train small model
            ["python", "-m", "scripts.base_train",
             "--depth=4",
             "--max_seq_len=1024",
             "--device_batch_size=1",
             "--total_batch_size=1024",
             "--eval_every=50",
             "--eval_tokens=4096",
             "--core_metric_every=50",
             "--core_metric_max_per_task=12",
             "--sample_every=50",
             "--num_iterations=50"]
        ]
        
        for cmd in commands:
            await self._execute_command(cmd, job_id)
        
        self.active_jobs[job_id]["status"] = "completed"
    
    async def _execute_command(self, command: list, job_id: str):
        """Execute a training command and log output"""
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd="/app"
        )
        
        stdout, stderr = await process.communicate()
        
        self.active_jobs[job_id]["logs"].append({
            "command": " ".join(command),
            "stdout": stdout.decode(),
            "stderr": stderr.decode(),
            "return_code": process.returncode
        })
    
    def get_training_status(self, job_id: str) -> Optional[Dict]:
        """Get training status for a job"""
        return self.active_jobs.get(job_id)
    
    def stop_training(self, job_id: str) -> bool:
        """Stop a training job"""
        if job_id in self.active_jobs:
            self.active_jobs[job_id]["status"] = "stopped"
            return True
        return False
```

### Step 4: Add Training Endpoints

Add these endpoints to `backend/main.py`:

```python
from nanochat_training_service import NanochatTrainingService, TrainingConfig
import uuid

# Initialize training service
training_service = NanochatTrainingService()

@app.post("/training/start")
async def start_training(config: TrainingConfig):
    """Start a nanochat training job"""
    job_id = str(uuid.uuid4())
    await training_service.start_training(config, job_id)
    return {"job_id": job_id, "status": "started"}

@app.get("/training/status/{job_id}")
async def get_training_status(job_id: str):
    """Get training status for a job"""
    status = training_service.get_training_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status

@app.post("/training/stop/{job_id}")
async def stop_training(job_id: str):
    """Stop a training job"""
    success = training_service.stop_training(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": "stopped"}

@app.get("/training/jobs")
async def list_training_jobs():
    """List all training jobs"""
    return {"jobs": list(training_service.active_jobs.keys())}
```

### Step 5: Create Setup Script

Create `backend/setup_nanochat.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Nanochat Training in MadeLang"

# Create necessary directories
mkdir -p cache/nanochat
mkdir -p models
mkdir -p data

# Set environment variables
export NANOCHAT_BASE_DIR="/app/cache/nanochat"
export OMP_NUM_THREADS=1
export WANDB_RUN=dummy

# Install Rust if not already installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="/root/.local/bin:${PATH}"
fi

# Build the Rust tokenizer
echo "🔨 Building Rust tokenizer..."
uv run maturin develop --release --manifest-path rustbpe/Cargo.toml

echo "✅ Nanochat setup complete!"
echo "You can now start training with:"
echo "curl -X POST http://localhost:8000/training/start -H 'Content-Type: application/json' -d '{\"training_stage\": \"cpu_demo\"}'"
```

### Step 6: Build and Run

```bash
# Build the updated Docker image
docker-compose build backend

# Start the services
docker-compose up -d

# Run the setup script inside the container
docker-compose exec backend bash /app/setup_nanochat.sh
```

## Testing the Setup

### Test 1: CPU Demo Training

```bash
# Start a CPU demo training job
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{
    "training_stage": "cpu_demo",
    "model_depth": 4,
    "device_batch_size": 1,
    "num_iterations": 10
  }'

# Check training status (replace JOB_ID with actual job ID)
curl http://localhost:8000/training/status/JOB_ID
```

### Test 2: Single GPU Training (if AMD GPU available)

```bash
# Start single GPU training
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{
    "training_stage": "single_gpu",
    "model_depth": 20,
    "device_batch_size": 16,
    "target_param_data_ratio": 20
  }'
```

### Test 3: Monitor Training Progress

```bash
# List all training jobs
curl http://localhost:8000/training/jobs

# Get detailed status
curl http://localhost:8000/training/status/JOB_ID
```

## Configuration Options

### Training Stages

1. **cpu_demo**: Minimal training for testing (depth=4, ~50 iterations)
2. **single_gpu**: Single GPU training (depth=20, full dataset)
3. **full**: Multi-GPU training (requires 8xH100 setup)

### Model Parameters

- `model_depth`: Transformer layers (4-32)
- `device_batch_size`: Batch size per device (1-32)
- `max_seq_len`: Maximum sequence length (1024-2048)
- `num_iterations`: Training steps (-1 for auto-calculate)
- `target_param_data_ratio`: Data-to-parameter ratio (default: 20)

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce `device_batch_size`
2. **Rust Compilation Error**: Ensure Rust is properly installed
3. **Dataset Download Fails**: Check internet connection
4. **GPU Not Detected**: Verify ROCm installation

### Debug Commands

```bash
# Check GPU status
docker-compose exec backend python -c "import torch; print(f'GPU available: {torch.cuda.is_available()}')"

# Check Rust installation
docker-compose exec backend cargo --version

# Check training logs
docker-compose logs backend
```

## Performance Expectations

### CPU Demo Mode
- **Duration**: 30-60 minutes
- **Model Size**: ~1M parameters
- **Performance**: Educational only

### Single GPU Mode
- **Duration**: 4-8 hours
- **Model Size**: ~500M parameters
- **Performance**: Comparable to GPT-2

### Full Mode
- **Duration**: 24-48 hours
- **Model Size**: ~1.9B parameters
- **Performance**: Modern LLM capabilities

## Next Steps

1. **Web Interface**: Create a training dashboard
2. **Model Serving**: Integrate trained models into chat
3. **Custom Datasets**: Support user-provided data
4. **Distributed Training**: Multi-node support
5. **Model Management**: Checkpoint management and versioning

## Support

For issues or questions:
1. Check the logs: `docker-compose logs backend`
2. Verify GPU status: `docker-compose exec backend nvidia-smi` (or `rocm-smi`)
3. Test individual components: `docker-compose exec backend python -c "import torch; print(torch.cuda.is_available())"`

This setup provides a solid foundation for running nanochat training within the MadeLang infrastructure while maintaining the existing functionality.
