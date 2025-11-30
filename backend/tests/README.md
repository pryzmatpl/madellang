# Nanochat Training Integration Tests

This directory contains comprehensive tests for the nanochat training integration in MadeLang.

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── test_training_service.py
├── integration/             # Integration tests
│   └── test_api_integration.py
├── functional/              # Functional tests
│   └── test_training_functionality.sh
├── conftest.py              # Pytest configuration
└── README.md               # This file
```

## Test Categories

### Unit Tests (`tests/unit/`)
- Test individual components in isolation
- Mock external dependencies
- Fast execution
- High coverage

**Files:**
- `test_training_service.py` - Tests for NanochatTrainingService class

**Run with:**
```bash
python -m pytest tests/unit/ -v
```

### Integration Tests (`tests/integration/`)
- Test component interactions
- Use real service instances
- Test API endpoints
- Moderate execution time

**Files:**
- `test_api_integration.py` - Tests for FastAPI endpoints

**Run with:**
```bash
python -m pytest tests/integration/ -v
```

### Functional Tests (`tests/functional/`)
- End-to-end testing
- Real service interactions
- Full training pipeline testing
- Long execution time

**Files:**
- `test_training_functionality.sh` - Full training workflow tests

**Run with:**
```bash
bash tests/functional/test_training_functionality.sh
```

## Running Tests

### Prerequisites
1. Install test dependencies:
   ```bash
   pip install -r requirements_test.txt
   ```

2. Ensure the service is running:
   ```bash
   docker-compose up -d backend
   ```

### Test Runner Script
Use the provided test runner script:

```bash
# Run all tests
./run_tests.sh

# Run specific test types
./run_tests.sh unit
./run_tests.sh integration
./run_tests.sh functional

# Start service and run tests
./run_tests.sh --start all

# Keep service running after tests
./run_tests.sh --start --keep functional
```

### Manual Test Execution

#### Unit Tests
```bash
python -m pytest tests/unit/ -v --tb=short
```

#### Integration Tests
```bash
python -m pytest tests/integration/ -v --tb=short
```

#### Functional Tests
```bash
bash tests/functional/test_training_functionality.sh
```

#### All Tests
```bash
python -m pytest tests/ -v --tb=short
```

## Test Configuration

### Pytest Configuration (`pytest.ini`)
- Test discovery patterns
- Output formatting
- Warning filters
- Markers for test categorization

### Environment Variables
Tests use the following environment variables:
- `NANOCHAT_BASE_DIR` - Base directory for nanochat data
- `OMP_NUM_THREADS` - Number of OpenMP threads
- `WANDB_RUN` - Weights & Biases run name

## Test Data

### Mock Data
- Training configurations
- Job status responses
- Command execution results

### Test Fixtures
- Service instances
- Mock subprocess calls
- Test clients

## Test Scenarios

### Unit Test Scenarios
1. **TrainingConfig Validation**
   - Default values
   - Custom configurations
   - Serialization/deserialization

2. **TrainingJob Management**
   - Job creation
   - Status updates
   - Completion handling

3. **NanochatTrainingService**
   - Service initialization
   - Job lifecycle management
   - Command execution
   - Error handling

### Integration Test Scenarios
1. **API Endpoints**
   - Start training
   - Get status
   - Get logs
   - Stop training
   - List jobs
   - Cleanup

2. **Error Handling**
   - Invalid configurations
   - Non-existent jobs
   - Service errors

3. **Concurrent Requests**
   - Multiple training jobs
   - Simultaneous status checks

### Functional Test Scenarios
1. **Service Health**
   - Health check endpoint
   - System info endpoint

2. **Training Pipeline**
   - CPU demo training
   - Progress monitoring
   - Log retrieval
   - Job completion

3. **Error Recovery**
   - Invalid requests
   - Service failures
   - Timeout handling

## Test Metrics

### Coverage Targets
- Unit tests: >90% line coverage
- Integration tests: >80% endpoint coverage
- Functional tests: >100% critical path coverage

### Performance Targets
- Unit tests: <1 second per test
- Integration tests: <5 seconds per test
- Functional tests: <30 minutes total

### Reliability Targets
- Test success rate: >95%
- Flaky test rate: <5%

## Debugging Tests

### Verbose Output
```bash
python -m pytest tests/ -v -s --tb=long
```

### Specific Test
```bash
python -m pytest tests/unit/test_training_service.py::TestTrainingConfig::test_default_config -v
```

### Debug Mode
```bash
python -m pytest tests/ --pdb
```

### Coverage Report
```bash
python -m pytest tests/ --cov=nanochat_training_service --cov-report=html
```

## Continuous Integration

### GitHub Actions
Tests are automatically run on:
- Pull requests
- Main branch pushes
- Scheduled runs

### Local CI Simulation
```bash
# Run tests as CI would
docker-compose exec backend ./run_tests.sh --start all
```

## Troubleshooting

### Common Issues

1. **Service Not Running**
   ```bash
   docker-compose up -d backend
   ```

2. **Missing Dependencies**
   ```bash
   pip install -r requirements_test.txt
   ```

3. **Permission Issues**
   ```bash
   chmod +x tests/functional/test_training_functionality.sh
   chmod +x run_tests.sh
   ```

4. **Port Conflicts**
   ```bash
   # Check if port 8000 is in use
   lsof -i :8000
   ```

### Test Failures

1. **Unit Test Failures**
   - Check mock configurations
   - Verify test data
   - Review assertion logic

2. **Integration Test Failures**
   - Verify service is running
   - Check API endpoint responses
   - Review request/response formats

3. **Functional Test Failures**
   - Check service logs
   - Verify training pipeline
   - Review timeout settings

## Contributing

### Adding New Tests
1. Follow naming conventions: `test_*.py`
2. Use appropriate test markers
3. Add docstrings for test methods
4. Include both positive and negative test cases

### Test Guidelines
1. **Isolation**: Tests should not depend on each other
2. **Deterministic**: Tests should produce consistent results
3. **Fast**: Unit tests should be fast (<1 second)
4. **Clear**: Test names should describe what they test
5. **Maintainable**: Tests should be easy to understand and modify

### Test Data Management
1. Use fixtures for common test data
2. Clean up after tests
3. Avoid hardcoded values
4. Use realistic test scenarios

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Docker Testing](https://docs.docker.com/develop/best-practices/)
- [Python Testing Best Practices](https://docs.python.org/3/library/unittest.html)
