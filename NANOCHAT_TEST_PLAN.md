# Nanochat Training Test Plan for MadeLang Integration

## Overview

This test plan outlines the comprehensive testing strategy for integrating nanochat training capabilities into the MadeLang backend. The tests are designed to ensure system stability, performance, and functionality across different hardware configurations.

## Test Environment Setup

### Prerequisites
- Docker and Docker Compose installed
- AMD GPU with ROCm support (for GPU tests)
- Minimum 16GB RAM
- 50GB+ free disk space
- Linux environment (Ubuntu 22.04 recommended)

### Test Data
- Small dataset (4 shards, ~1GB) for CPU tests
- Medium dataset (16 shards, ~4GB) for GPU tests
- Full dataset (240+ shards, ~24GB) for performance tests

## Test Categories

### 1. Unit Tests

#### 1.1 Training Service Tests
```python
# tests/test_training_service.py
import pytest
from nanochat_training_service import NanochatTrainingService, TrainingConfig

def test_training_config_validation():
    """Test training configuration validation"""
    config = TrainingConfig(
        model_depth=4,
        device_batch_size=1,
        training_stage="cpu_demo"
    )
    assert config.model_depth == 4
    assert config.device_batch_size == 1

def test_training_service_initialization():
    """Test training service initialization"""
    service = NanochatTrainingService()
    assert len(service.active_jobs) == 0
    assert len(service.training_status) == 0

def test_job_creation():
    """Test training job creation"""
    service = NanochatTrainingService()
    config = TrainingConfig(training_stage="cpu_demo")
    job_id = service.create_job(config)
    assert job_id in service.active_jobs
```

#### 1.2 Configuration Tests
```python
# tests/test_config.py
def test_environment_variables():
    """Test required environment variables are set"""
    import os
    assert os.getenv('NANOCHAT_BASE_DIR') is not None
    assert os.getenv('OMP_NUM_THREADS') == '1'

def test_gpu_detection():
    """Test GPU detection and configuration"""
    import torch
    if torch.cuda.is_available():
        assert torch.cuda.device_count() > 0
        assert torch.cuda.get_device_name(0) is not None
```

### 2. Integration Tests

#### 2.1 Docker Integration Tests
```bash
#!/bin/bash
# tests/docker_integration.sh

echo "Testing Docker build..."
docker-compose build backend
if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "Testing container startup..."
docker-compose up -d backend
sleep 10

echo "Testing health endpoint..."
curl -f http://localhost:8000/health
if [ $? -ne 0 ]; then
    echo "❌ Health check failed"
    exit 1
fi

echo "Testing training endpoints..."
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{"training_stage": "cpu_demo", "num_iterations": 1}'
if [ $? -ne 0 ]; then
    echo "❌ Training start failed"
    exit 1
fi

echo "✅ Docker integration tests passed"
```

#### 2.2 API Integration Tests
```python
# tests/test_api_integration.py
import requests
import time

def test_training_endpoints():
    """Test training API endpoints"""
    base_url = "http://localhost:8000"
    
    # Test start training
    response = requests.post(
        f"{base_url}/training/start",
        json={"training_stage": "cpu_demo", "num_iterations": 1}
    )
    assert response.status_code == 200
    job_id = response.json()["job_id"]
    
    # Test get status
    response = requests.get(f"{base_url}/training/status/{job_id}")
    assert response.status_code == 200
    assert response.json()["status"] in ["starting", "running"]
    
    # Test list jobs
    response = requests.get(f"{base_url}/training/jobs")
    assert response.status_code == 200
    assert job_id in response.json()["jobs"]
```

### 3. Functional Tests

#### 3.1 CPU Demo Training Test
```bash
#!/bin/bash
# tests/cpu_demo_test.sh

echo "🧪 Testing CPU Demo Training..."

# Start CPU demo training
JOB_ID=$(curl -s -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{
    "training_stage": "cpu_demo",
    "model_depth": 4,
    "device_batch_size": 1,
    "num_iterations": 5
  }' | jq -r '.job_id')

echo "Job ID: $JOB_ID"

# Monitor training progress
for i in {1..30}; do
    STATUS=$(curl -s http://localhost:8000/training/status/$JOB_ID | jq -r '.status')
    echo "Status: $STATUS"
    
    if [ "$STATUS" = "completed" ]; then
        echo "✅ CPU demo training completed successfully"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo "❌ CPU demo training failed"
        exit 1
    fi
    
    sleep 10
done

if [ "$STATUS" != "completed" ]; then
    echo "❌ CPU demo training timed out"
    exit 1
fi
```

#### 3.2 Single GPU Training Test
```bash
#!/bin/bash
# tests/single_gpu_test.sh

echo "🧪 Testing Single GPU Training..."

# Check GPU availability
GPU_AVAILABLE=$(docker-compose exec backend python -c "import torch; print(torch.cuda.is_available())")
if [ "$GPU_AVAILABLE" != "True" ]; then
    echo "⚠️ GPU not available, skipping GPU test"
    exit 0
fi

# Start single GPU training
JOB_ID=$(curl -s -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{
    "training_stage": "single_gpu",
    "model_depth": 8,
    "device_batch_size": 4,
    "num_iterations": 10
  }' | jq -r '.job_id')

echo "Job ID: $JOB_ID"

# Monitor training progress
for i in {1..60}; do
    STATUS=$(curl -s http://localhost:8000/training/status/$JOB_ID | jq -r '.status')
    echo "Status: $STATUS"
    
    if [ "$STATUS" = "completed" ]; then
        echo "✅ Single GPU training completed successfully"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo "❌ Single GPU training failed"
        exit 1
    fi
    
    sleep 30
done
```

### 4. Performance Tests

#### 4.1 Memory Usage Test
```python
# tests/test_memory_usage.py
import psutil
import time
import requests

def test_memory_usage_during_training():
    """Test memory usage during training"""
    initial_memory = psutil.virtual_memory().used
    
    # Start training
    response = requests.post(
        "http://localhost:8000/training/start",
        json={"training_stage": "cpu_demo", "num_iterations": 10}
    )
    job_id = response.json()["job_id"]
    
    # Monitor memory usage
    max_memory = initial_memory
    for _ in range(30):
        current_memory = psutil.virtual_memory().used
        max_memory = max(max_memory, current_memory)
        time.sleep(2)
    
    memory_increase = max_memory - initial_memory
    assert memory_increase < 8 * 1024 * 1024 * 1024  # Less than 8GB increase
```

#### 4.2 Training Speed Test
```python
# tests/test_training_speed.py
import time
import requests

def test_training_speed():
    """Test training speed benchmarks"""
    start_time = time.time()
    
    # Start training
    response = requests.post(
        "http://localhost:8000/training/start",
        json={
            "training_stage": "cpu_demo",
            "model_depth": 4,
            "num_iterations": 20
        }
    )
    job_id = response.json()["job_id"]
    
    # Wait for completion
    while True:
        status_response = requests.get(f"http://localhost:8000/training/status/{job_id}")
        status = status_response.json()["status"]
        
        if status == "completed":
            break
        elif status == "failed":
            assert False, "Training failed"
        
        time.sleep(5)
    
    end_time = time.time()
    training_time = end_time - start_time
    
    # CPU demo should complete within reasonable time
    assert training_time < 1800  # Less than 30 minutes
```

### 5. Stress Tests

#### 5.1 Concurrent Training Jobs
```python
# tests/test_concurrent_training.py
import asyncio
import aiohttp

async def test_concurrent_training():
    """Test multiple concurrent training jobs"""
    async with aiohttp.ClientSession() as session:
        # Start multiple training jobs
        tasks = []
        for i in range(3):
            task = session.post(
                "http://localhost:8000/training/start",
                json={"training_stage": "cpu_demo", "num_iterations": 5}
            )
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks)
        job_ids = [resp.json()["job_id"] for resp in responses]
        
        # All jobs should start successfully
        assert len(job_ids) == 3
        
        # Monitor all jobs
        for job_id in job_ids:
            status_response = await session.get(f"http://localhost:8000/training/status/{job_id}")
            assert status_response.status == 200
```

#### 5.2 Resource Exhaustion Test
```bash
#!/bin/bash
# tests/resource_exhaustion_test.sh

echo "🧪 Testing Resource Exhaustion..."

# Start multiple training jobs to test resource limits
for i in {1..5}; do
    curl -s -X POST http://localhost:8000/training/start \
      -H 'Content-Type: application/json' \
      -d '{
        "training_stage": "cpu_demo",
        "model_depth": 4,
        "device_batch_size": 1,
        "num_iterations": 100
      }' &
done

# Wait for all jobs to start
sleep 10

# Check system resources
MEMORY_USAGE=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

echo "Memory usage: ${MEMORY_USAGE}%"
echo "CPU usage: ${CPU_USAGE}%"

# System should remain stable
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    echo "⚠️ High memory usage detected"
fi

if (( $(echo "$CPU_USAGE > 95" | bc -l) )); then
    echo "⚠️ High CPU usage detected"
fi
```

### 6. Error Handling Tests

#### 6.1 Invalid Configuration Test
```python
# tests/test_error_handling.py
import requests

def test_invalid_configuration():
    """Test handling of invalid configurations"""
    # Test invalid model depth
    response = requests.post(
        "http://localhost:8000/training/start",
        json={"model_depth": -1}
    )
    assert response.status_code == 422  # Validation error
    
    # Test invalid training stage
    response = requests.post(
        "http://localhost:8000/training/start",
        json={"training_stage": "invalid_stage"}
    )
    assert response.status_code == 422

def test_nonexistent_job():
    """Test handling of nonexistent job requests"""
    response = requests.get("http://localhost:8000/training/status/nonexistent")
    assert response.status_code == 404
```

#### 6.2 Network Failure Test
```python
# tests/test_network_failure.py
import requests
import time

def test_network_failure_recovery():
    """Test recovery from network failures"""
    # Start training
    response = requests.post(
        "http://localhost:8000/training/start",
        json={"training_stage": "cpu_demo", "num_iterations": 10}
    )
    job_id = response.json()["job_id"]
    
    # Simulate network failure by stopping container
    # (This would be done manually in actual test)
    
    # Restart container
    # (This would be done manually in actual test)
    
    # Check if training can resume
    time.sleep(10)
    response = requests.get(f"http://localhost:8000/training/status/{job_id}")
    # Should either show completed status or allow restart
    assert response.status_code in [200, 404]
```

## Test Execution Plan

### Phase 1: Basic Functionality (Week 1)
1. Unit tests for training service
2. Docker integration tests
3. API endpoint tests
4. CPU demo training test

### Phase 2: Performance Testing (Week 2)
1. Memory usage tests
2. Training speed benchmarks
3. Single GPU training tests
4. Resource monitoring tests

### Phase 3: Stress Testing (Week 3)
1. Concurrent training jobs
2. Resource exhaustion tests
3. Error handling tests
4. Network failure recovery tests

### Phase 4: Production Readiness (Week 4)
1. End-to-end integration tests
2. Performance optimization tests
3. Security tests
4. Documentation validation

## Test Data and Metrics

### Success Criteria
- **Functionality**: All training stages complete successfully
- **Performance**: CPU demo completes in <30 minutes
- **Stability**: No crashes during 24-hour stress test
- **Resource Usage**: Memory usage <8GB for CPU demo
- **Error Handling**: Graceful handling of all error conditions

### Performance Benchmarks
- **CPU Demo**: 4-layer model, 50 iterations, <30 minutes
- **Single GPU**: 8-layer model, 100 iterations, <2 hours
- **Memory Usage**: <8GB for CPU demo, <16GB for GPU training
- **API Response**: <1 second for status requests

### Monitoring Metrics
- Training loss progression
- Memory usage over time
- CPU/GPU utilization
- API response times
- Error rates and types

## Test Automation

### Continuous Integration
```yaml
# .github/workflows/nanochat-tests.yml
name: Nanochat Training Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker image
        run: docker-compose build backend
      - name: Run unit tests
        run: docker-compose exec backend pytest tests/unit/
      - name: Run integration tests
        run: docker-compose exec backend pytest tests/integration/
      - name: Run functional tests
        run: bash tests/functional_tests.sh
```

### Test Reporting
- JUnit XML reports for CI/CD
- HTML coverage reports
- Performance benchmark results
- Error log aggregation

## Rollback Plan

### Test Failure Response
1. **Unit Test Failure**: Fix code, re-run tests
2. **Integration Test Failure**: Check Docker configuration
3. **Functional Test Failure**: Investigate training pipeline
4. **Performance Test Failure**: Optimize resource usage
5. **Stress Test Failure**: Implement better resource management

### Emergency Procedures
1. Stop all training jobs
2. Restart Docker containers
3. Clear cache and temporary files
4. Restore from backup configuration
5. Notify development team

This comprehensive test plan ensures the nanochat training integration is robust, performant, and ready for production use.
