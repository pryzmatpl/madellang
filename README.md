# Madellang: Real-Time Voice Translation + AI Training Platform

Madellang is a comprehensive AI platform that combines real-time voice translation with local AI model training capabilities. Built for ultra-low latency, multilingual communication, it leverages advanced AI models (local and cloud), WebSockets, and GPU acceleration (AMD ROCm) to provide seamless voice translation AND the ability to train your own ChatGPT-like models locally.

---

## Features

### 🎤 **Voice Translation**
- **Real-time voice translation** with WebSocket streaming
- **Room-based architecture** for group conversations
- **Multi-language support** (speech-to-text, translation, text-to-speech)
- **Optimized for AMD GPUs** using ROCm (backend)
- **Web-based interface** with a modern React frontend
- **QR code room sharing** for instant access
- **Bidirectional audio streaming** (speak and listen simultaneously)
- **Minimalist, single-screen UI**
- **Configurable AI backend**: Use OpenAI Whisper, Google, DeepL, or local models (Whisper, Vosk, Coqui TTS)

### 🧠 **AI Model Training** 
- **🆕 Nanochat Integration**: Complete ChatGPT-like model training pipeline
- **🆕 Local Training**: Train models directly on your AMD GPU
- **🆕 Multiple Training Modes**: CPU demo, single GPU, and full multi-GPU training
- **🆕 Real-time Monitoring**: Track training progress, logs, and metrics via web UI
- **🆕 Background Processing**: Training runs asynchronously without blocking services
- **🆕 Comprehensive Testing**: Unit, integration, and functional test suites
- **🆕 Training UI**: Full web interface for managing training jobs
- **🆕 Model Management**: Start, stop, monitor, and download trained models

### 🛠️ **Development & Infrastructure**
- **Extensive UI component library** for rapid development
- **Docker Integration**: Complete containerized setup with AMD GPU support
- **Unified Dependencies**: Resolved version conflicts between projects
- **ROCm Support**: Full AMD GPU acceleration for both translation and training
- **Rust Integration**: Custom BPE tokenizer compilation
- **Comprehensive Documentation**: Detailed setup and usage guides

---

## Architecture Overview

### 1. Frontend (`frontend/`)
- **Framework**: React (TypeScript)
- **Key Features**:
  - Audio capture and playback
  - WebSocket client for real-time streaming
  - Room management and QR code sharing
  - Language selection and translation controls
  - Modular UI components (in `src/components/` and `src/components/ui/`)
  - Custom React hooks for audio, room, and device management
- **Structure**:
  - `src/components/`: Main UI and logic components (audio, room, translation, QR, etc.)
  - `src/components/ui/`: Reusable UI primitives (buttons, dialogs, forms, etc.)
  - `src/services/`: Service layer for API/WebSocket communication
  - `src/hooks/`: Custom hooks for state and effect management
  - `src/pages/`: Main page routing and layout

### 2. Backend (`backend/`)
- **Framework**: FastAPI (Python)
- **Key Features**:
  - WebSocket server for real-time audio streaming and translation
  - Room and participant management
  - Audio processing pipeline: Speech-to-Text → Translation → Text-to-Speech
  - Model management: switch between cloud APIs and local models
  - Health checks and REST endpoints for room management
  - GPU monitoring and optimization for AMD ROCm
  - **🆕 Complete Nanochat Integration**: Full ChatGPT-like model training pipeline
  - **🆕 Local Training Service**: Train models directly in Docker container
  - **🆕 Real-time Monitoring**: Track training progress and metrics
- **Structure**:
  - `main.py`: FastAPI app and endpoints
  - `room_manager.py`: Room and participant logic
  - `audio_processor.py`: Audio stream processing
  - `model_manager.py`: AI model orchestration
  - `translation_service.py`: Translation logic
  - `nanochat_training_service.py`: **🆕** Nanochat training management
  - `deps/nanochat/`: **🆕** Complete nanochat source code and training scripts
  - `setup_nanochat_deps.sh`: **🆕** Nanochat integration setup
  - `test_nanochat_integration.py`: **🆕** Integration testing
  - `tests/`: Automated test suite for core features and training

---

## Quick Start

### Prerequisites
- AMD GPU with ROCm support (for local backend acceleration)
- Docker & Docker Compose (recommended)
- Node.js (for frontend)
- Python 3.8+ (for backend)

### Using Docker Compose
```bash
git clone https://github.com/piotroxp/madellang.git
cd madellang
make dev
```
Access the app at [http://localhost:3000](http://localhost:3000)

### Manual Installation

#### Backend
```bash
cd backend
pip install -r requirements_amd.txt
./run_amd_gpu.sh
```

#### Frontend
```bash
cd frontend
npm install
npm start
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🧠 **Nanochat Training Integration**

Madellang now includes **complete nanochat integration**, allowing you to train your own ChatGPT-like models locally using the same AMD GPU infrastructure. This is a **major achievement** that brings full AI model training capabilities directly into the platform!

### 🎉 **What's New**

- **🆕 Complete Integration**: Full nanochat source code included in `backend/deps/nanochat`
- **🆕 Local Training**: Train models directly in Docker container with AMD GPU acceleration
- **🆕 Web UI**: Comprehensive training interface at `/training`
- **🆕 Real-time Monitoring**: Track progress, logs, and metrics in real-time
- **🆕 Multiple Modes**: CPU demo, single GPU, and full multi-GPU training
- **🆕 Background Processing**: Training runs asynchronously without blocking services
- **🆕 Comprehensive Testing**: Full test suite for integration validation

### 🚀 **Quick Start with Training**

1. **Start the Platform**:
   ```bash
   make dev
   # or
   docker-compose up
   ```

2. **Access Training UI**:
   ```
   http://localhost:3000/training
   ```

3. **Start Training** (CPU Demo):
   ```bash
   curl -X POST http://localhost:8000/training/start \
     -H 'Content-Type: application/json' \
     -d '{"training_stage": "cpu_demo", "num_iterations": 10}'
   ```

4. **Monitor Progress**:
   ```bash
   curl http://localhost:8000/training/status/JOB_ID
   ```

### 📊 **Training Modes**

| Mode | Description | Duration | Model Size | Use Case |
|------|-------------|----------|------------|----------|
| **CPU Demo** | Minimal training for testing | ~30 min | 4 layers, ~1M params | Learning/testing |
| **Single GPU** | Full training on one GPU | ~4-8 hours | 20 layers, ~500M params | Production models |
| **Full Training** | Multi-GPU training | ~24-48 hours | 32 layers, ~1.9B params | State-of-the-art models |

### 🔧 **API Endpoints**

- `POST /training/start` - Start a training job
- `GET /training/status/{job_id}` - Get training progress
- `GET /training/logs/{job_id}` - Get training logs
- `POST /training/stop/{job_id}` - Stop a training job
- `GET /training/jobs` - List all training jobs
- `GET /training/config/templates` - Get predefined configurations

### 📚 **Documentation**

- [Nanochat Deps Integration](backend/NANOCHAT_DEPS_README.md) - Complete integration guide
- [Training UI Documentation](frontend/TRAINING_UI_README.md) - Web interface guide
- [Dependency Analysis](DEPENDENCY_COMPARISON.md) - Technical implementation details
- [Nanochat Quick Reference](NANOCHAT_QUICK_REFERENCE.md) - Quick commands reference
- **[🎉 GLORIOUS ACHIEVEMENT](GLORIOUS_ACHIEVEMENT.md)** - **Complete integration summary and celebration!**

---

## Usage

1. Create or join a room (QR code or link)
2. Select your target language
3. Grant microphone permissions
4. Click "Start Recording" and begin speaking
5. Hear translated speech from other participants in your chosen language

---

## API & Integration

### Voice Translation API
- **WebSocket endpoint**: `/ws/{room_id}?target_lang={language_code}`
- **REST endpoints**: Room creation, participant count, health check
- **Frontend integration**: See backend/README.md for code samples

### 🆕 Nanochat Training API
- **Training Management**: Start, monitor, and stop training jobs
- **Real-time Monitoring**: Track progress, logs, and metrics
- **Configuration Templates**: Predefined training configurations
- **Job Management**: List, cleanup, and manage training jobs

### Example API Usage

**Start Training**:
```bash
curl -X POST http://localhost:8000/training/start \
  -H 'Content-Type: application/json' \
  -d '{"training_stage": "cpu_demo", "num_iterations": 50}'
```

**Monitor Progress**:
```bash
curl http://localhost:8000/training/status/{job_id}
```

**Get Training Logs**:
```bash
curl http://localhost:8000/training/logs/{job_id}
```

---

## Testing

### Voice Translation Tests
- Backend: Run tests in `backend/tests/`
- Frontend: Run `npm test` in `frontend/`

### 🆕 Nanochat Training Tests
- **Unit Tests**: Component testing with mocks
- **Integration Tests**: API endpoint testing
- **Functional Tests**: End-to-end training pipeline testing
- **Automated Test Runner**: `./run_tests.sh --start all`

**Run All Tests**:
```bash
docker-compose exec backend ./run_tests.sh --start all
```

**Run Specific Test Types**:
```bash
docker-compose exec backend ./run_tests.sh unit
docker-compose exec backend ./run_tests.sh integration
docker-compose exec backend ./run_tests.sh functional
```

---

## License

MIT License © 2025 Piotr Slupski

---

## Contributing

Contributions are welcome! Fork the repo, make your changes, and submit a PR.

---

**Enjoy real-time, low-latency voice translation with Madellang!**

---

# Legacy Quick Start & Troubleshooting

The following section is preserved from the original documentation for reference:

# Voice Translation Application

Real-time voice translation application using Whisper for speech recognition and AMD ROCm for GPU acceleration.

## Features

- Real-time voice translation with WebSocket streaming
- Support for multiple languages 
- Optimized for AMD GPUs using ROCm
- Web-based interface with React frontend
- Room-based architecture for group conversations

## Requirements

- AMD GPU with ROCm support
- Docker and Docker Compose
- At least 8GB RAM
- 20GB free disk space

## Quick Start

### Using Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/piotroxp/madellang.git
   cd madellang
   ```

2. Adjust environment variables in docker-compose.yml if needed:
   - Set the appropriate GPU architecture version in HSA_OVERRIDE_GFX_VERSION
   - Change WHISPER_MODEL to match your GPU capabilities (tiny, small, medium)

3. Start the application:
   ```bash
   make dev
   ```

4. Access the web interface at http://localhost:3000

### Manual Installation

#### Backend Setup

1. Install ROCm according to AMD's instructions for your OS

2. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements_amd.txt
   ```

3. Run the backend:
   ```bash
   ./run_amd_gpu.sh
   ```

#### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Access the web interface at http://localhost:3000

## Usage Guide

1. Create a new room or join an existing one
2. Select your desired target language
3. Grant microphone permissions when prompted
4. Click "Start Recording" to begin speaking
5. Your voice will be translated and sent to other participants
6. Other participants will hear your translated speech in their selected language

## Troubleshooting

### Common AMD GPU Issues

- **HIP error: invalid device function**: Set the correct `HSA_OVERRIDE_GFX_VERSION` for your GPU
- **Out of memory errors**: Switch to a smaller model like "tiny" or "small"
- **Audio not playing**: Check browser permissions and ensure WebRTC is enabled

### Browser Support

The application works best with:
- Chrome 74+
- Firefox 66+
- Edge 79+
- Safari 12.1+

## License

MIT 