# Madellang Backend: Voice Translation + AI Training Platform

A comprehensive backend built with FastAPI, WebSockets, and AI services that enables multilingual communication AND local AI model training. **Now featuring complete nanochat integration for training ChatGPT-like models directly in Docker containers with AMD GPU acceleration!**

## Features

### 🎤 **Voice Translation**
- Real-time voice translation using WebSockets
- Support for multiple languages
- Room-based system for group conversations
- Configurable to use either cloud APIs or local models
- Complete audio processing pipeline: Speech-to-Text → Translation → Text-to-Speech

### 🧠 **AI Model Training** 
- **🆕 Complete Nanochat Integration**: Full ChatGPT-like model training pipeline
- **🆕 Local Training Service**: Train models directly in Docker container
- **🆕 Multiple Training Modes**: CPU demo, single GPU, and full multi-GPU training
- **🆕 Real-time Monitoring**: Track training progress, logs, and metrics via API
- **🆕 Background Processing**: Training runs asynchronously without blocking services
- **🆕 Comprehensive Testing**: Unit, integration, and functional test suites
- **🆕 AMD GPU Acceleration**: Full ROCm support for training
- **🆕 Rust Integration**: Custom BPE tokenizer compilation

## Architecture

The backend consists of six main components:

1. **WebSocket Server**: Handles real-time bidirectional communication with clients
2. **Room Manager**: Creates and manages translation rooms
3. **Audio Processing Pipeline**: Processes incoming audio streams
4. **Model Manager**: Handles different AI models (local and API-based)
5. **🆕 Nanochat Training Service**: Manages background training jobs for ChatGPT-like models
6. **🆕 Local Nanochat Integration**: Complete nanochat source code and training scripts in `deps/nanochat/`

## Installation

### Prerequisites

- Python 3.8+
- pip

### Setup

1. Clone the repository:

```bash
git clone https://github.com/piotroxp/madellang.git
cd madellang/backend
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

## 🧠 **Nanochat Training Integration**

### 🎉 **Major Achievement**
The backend now includes **complete nanochat integration** - a full ChatGPT-like model training pipeline that runs directly in Docker containers with AMD GPU acceleration!

### Prerequisites for Training
- AMD GPU with ROCm support (recommended)
- At least 16GB RAM
- 50GB+ free disk space
- Rust compiler (installed automatically)
- Docker with GPU support

### Quick Setup
```bash
# The integration is automatically set up in Docker
docker-compose up backend

# Or run setup manually
bash setup_nanochat_deps.sh

# Test the integration
python3 test_nanochat_integration.py

# Start a CPU demo training
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{"training_stage": "cpu_demo", "num_iterations": 10}'
```

### Training Modes
- **CPU Demo**: 4-layer model, ~50 iterations, <30 minutes
- **Single GPU**: 20-layer model, full dataset, <8 hours  
- **Full Training**: 32-layer model, multi-GPU, 24+ hours

### What's Included
- **Complete Source Code**: Full nanochat in `deps/nanochat/`
- **Training Scripts**: Direct access to all training scripts
- **Rust Tokenizer**: Custom BPE tokenizer compilation
- **Web UI**: Full training interface at `/training`
- **Real-time Monitoring**: Progress tracking and logs
- **AMD GPU Support**: Full ROCm acceleration

For detailed setup instructions, see [NANOCHAT_DEPS_README.md](NANOCHAT_DEPS_README.md)

## Configuration

### API Mode (Default)

Set the following environment variables for API access:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export DEEPL_API_KEY="your-deepl-api-key"
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"
```

### Local Model Mode

To use local models instead of APIs:

```bash
export USE_LOCAL_MODELS="true"
```

Note: When using local models, you'll need to uncomment and install the additional dependencies in `requirements.txt`.

## Running the Application

Start the server with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- HTTP: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws/{room_id}?target_lang={language_code}`

## API Endpoints

### Voice Translation
- `GET /` - Health check endpoint
- `GET /create-room` - Create a new translation room
- `GET /rooms/{room_id}/participants` - Get count of participants in a room
- `WebSocket /ws/{room_id}` - WebSocket connection for real-time translation

### 🆕 Nanochat Training
- `POST /training/start` - Start a training job
- `GET /training/status/{job_id}` - Get training progress
- `GET /training/logs/{job_id}` - Get training logs
- `POST /training/stop/{job_id}` - Stop a training job
- `GET /training/jobs` - List all training jobs
- `POST /training/cleanup` - Clean up old jobs
- `GET /training/config/templates` - Get predefined configurations

## WebSocket Communication

### Connecting to a Room

Connect to the WebSocket endpoint with:

```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}?target_lang=es`);
```

- `roomId`: Unique identifier for the translation room
- `target_lang`: Target language code (e.g., "es" for Spanish)

### Sending/Receiving Audio

- **Sending**: Send binary audio data (e.g., from a microphone) directly to the WebSocket
- **Receiving**: Listen for binary audio data as the translated response

### Status Updates

The server sends JSON messages with room status updates:

```javascript
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Handle audio data
    const audioBlob = event.data;
    // Play the audio
  } else {
    // Handle JSON messages (participant updates, etc.)
    const data = JSON.parse(event.data);
    if (data.type === "participants_update") {
      console.log(`Participants: ${data.count}`);
    }
  }
};
```

## Frontend Integration

To integrate with a React frontend, update your WebSocket connection hook:

```javascript
const connectWebSocket = (roomId, targetLanguage) => {
  const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}?target_lang=${targetLanguage}`);
  
  ws.onopen = () => {
    // Handle connection established
  };
  
  ws.onmessage = (event) => {
    if (event.data instanceof Blob) {
      // Handle audio data
      const audioBlob = event.data;
      // Play the audio or pass to callback
    } else {
      // Handle JSON messages (participant updates, etc.)
      const data = JSON.parse(event.data);
      if (data.type === "participants_update") {
        // Update participant count
      }
    }
  };
  
  return ws;
};
```

## 🆕 Nanochat Training API Usage

### Starting a Training Job

```javascript
const startTraining = async (config) => {
  const response = await fetch('http://localhost:8000/training/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config)
  });
  
  const result = await response.json();
  return result.job_id;
};

// Start CPU demo training
const jobId = await startTraining({
  training_stage: "cpu_demo",
  model_depth: 4,
  device_batch_size: 1,
  num_iterations: 50
});
```

### Monitoring Training Progress

```javascript
const monitorTraining = async (jobId) => {
  const response = await fetch(`http://localhost:8000/training/status/${jobId}`);
  const status = await response.json();
  
  console.log(`Status: ${status.status}`);
  console.log(`Progress: ${status.progress}%`);
  console.log(`Current Stage: ${status.current_stage}`);
  
  return status;
};

// Poll for updates
setInterval(() => {
  monitorTraining(jobId);
}, 5000);
```

### Getting Training Logs

```javascript
const getTrainingLogs = async (jobId) => {
  const response = await fetch(`http://localhost:8000/training/logs/${jobId}`);
  const logs = await response.json();
  
  logs.logs.forEach(log => {
    console.log(`Command: ${log.command}`);
    console.log(`Output: ${log.stdout}`);
    if (log.stderr) console.log(`Error: ${log.stderr}`);
  });
};
```

## Project Structure

```
madellang-backend/
├── main.py                      # FastAPI application and endpoints
├── room_manager.py              # Room and participant management
├── audio_processor.py           # Audio processing pipeline
├── model_manager.py             # AI model management
├── translation_service.py       # Translation logic
├── nanochat_training_service.py # 🆕 Nanochat training management
├── setup_nanochat_deps.sh      # 🆕 Nanochat integration setup
├── test_nanochat_integration.py # 🆕 Integration testing
├── run_tests.sh                # 🆕 Automated test runner
├── requirements_unified.txt     # 🆕 Unified dependencies
├── requirements_test.txt        # 🆕 Test dependencies
├── pytest.ini                  # 🆕 Pytest configuration
├── deps/                        # 🆕 Dependencies directory
│   └── nanochat/               # 🆕 Complete nanochat source code
│       ├── nanochat/           # Python package
│       ├── scripts/            # Training scripts
│       ├── rustbpe/            # Rust tokenizer
│       ├── tasks/              # Evaluation tasks
│       └── pyproject.toml      # Dependencies
└── tests/                       # 🆕 Comprehensive test suite
    ├── unit/                    # Unit tests
    ├── integration/             # Integration tests
    ├── functional/              # Functional tests
    └── README.md               # Test documentation
```

## Testing

### Running Tests

The backend includes comprehensive test suites for both voice translation and nanochat training:

```bash
# Run all tests
./run_tests.sh --start all

# Run specific test types
./run_tests.sh unit          # Unit tests
./run_tests.sh integration   # Integration tests  
./run_tests.sh functional   # Functional tests
```

### Test Types

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **Functional Tests**: End-to-end testing of training pipelines

### Test Configuration

- `pytest.ini`: Pytest configuration and markers
- `requirements_test.txt`: Test-specific dependencies
- `tests/README.md`: Detailed test documentation

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.