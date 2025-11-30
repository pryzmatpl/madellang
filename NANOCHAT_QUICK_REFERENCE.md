# Nanochat Training Quick Reference

## 🚀 Quick Start

### 1. Setup Environment
```bash
docker-compose exec backend bash /app/setup_nanochat.sh
```

### 2. Start Training
```bash
# CPU Demo (testing)
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{"training_stage": "cpu_demo", "num_iterations": 10}'

# Single GPU (production)
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{"training_stage": "single_gpu", "model_depth": 20}'
```

### 3. Monitor Progress
```bash
curl http://localhost:8000/training/status/JOB_ID
```

### 4. Run Tests
```bash
docker-compose exec backend ./run_tests.sh --start all
```

## 📊 Training Modes

| Mode | Duration | Model Size | Use Case |
|------|----------|------------|----------|
| **CPU Demo** | ~30 min | 4 layers, ~1M params | Testing/learning |
| **Single GPU** | ~4-8 hours | 20 layers, ~500M params | Production |
| **Full Training** | ~24-48 hours | 32 layers, ~1.9B params | Research |

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/training/start` | Start training job |
| `GET` | `/training/status/{job_id}` | Get progress |
| `GET` | `/training/logs/{job_id}` | Get logs |
| `POST` | `/training/stop/{job_id}` | Stop job |
| `GET` | `/training/jobs` | List jobs |
| `GET` | `/training/config/templates` | Get configs |

## 🧪 Test Commands

```bash
# All tests
./run_tests.sh --start all

# Specific types
./run_tests.sh unit
./run_tests.sh integration
./run_tests.sh functional

# With service start
./run_tests.sh --start --keep functional
```

## 📁 Key Files

- `nanochat_training_service.py` - Training service
- `setup_nanochat.sh` - Environment setup
- `run_tests.sh` - Test runner
- `tests/` - Test suites
- `NANOCHAT_SETUP_GUIDE.md` - Detailed setup
- `NANOCHAT_TEST_PLAN.md` - Test documentation

## ⚡ Common Commands

```bash
# Check service health
curl http://localhost:8000/health

# List training jobs
curl http://localhost:8000/training/jobs

# Get config templates
curl http://localhost:8000/training/config/templates

# Cleanup old jobs
curl -X POST http://localhost:8000/training/cleanup
```

## 🔍 Troubleshooting

### Service Not Running
```bash
docker-compose up -d backend
```

### GPU Not Detected
```bash
docker-compose exec backend python -c "import torch; print(torch.cuda.is_available())"
```

### Training Fails
```bash
# Check logs
curl http://localhost:8000/training/logs/JOB_ID

# Check system info
curl http://localhost:8000/system-info
```

## 📚 Documentation

- [Integration Plan](NANOCHAT_INTEGRATION_PLAN.md) - Technical details
- [Setup Guide](NANOCHAT_SETUP_GUIDE.md) - Step-by-step setup
- [Test Plan](NANOCHAT_TEST_PLAN.md) - Testing strategy
- [Backend README](README.md) - Full backend documentation
