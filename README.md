# Madellang: Real-Time Voice Translation Platform

Madellang is a real-time voice translation application designed for ultra-low latency, multilingual communication. It leverages advanced AI models (local and cloud), WebSockets, and GPU acceleration (AMD ROCm) to provide seamless, bidirectional voice translation in group or one-on-one settings.

---

## Features

- **Real-time voice translation** with WebSocket streaming
- **Room-based architecture** for group conversations
- **Multi-language support** (speech-to-text, translation, text-to-speech)
- **Optimized for AMD GPUs** using ROCm (backend)
- **Web-based interface** with a modern React frontend
- **QR code room sharing** for instant access
- **Bidirectional audio streaming** (speak and listen simultaneously)
- **Minimalist, single-screen UI**
- **Configurable AI backend**: Use OpenAI Whisper, Google, DeepL, or local models (Whisper, Vosk, Coqui TTS)
- **Extensive UI component library** for rapid development
- **🆕 Nanochat Training Integration**: Train your own ChatGPT-like models locally

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
  - **🆕 Nanochat Training Service**: Train ChatGPT-like models locally
- **Structure**:
  - `main.py`: FastAPI app and endpoints
  - `room_manager.py`: Room and participant logic
  - `audio_processor.py`: Audio stream processing
  - `model_manager.py`: AI model orchestration
  - `translation_service.py`: Translation logic
  - `nanochat_training_service.py`: **🆕** Nanochat training management
  - `setup_nanochat.sh`: **🆕** Nanochat environment setup
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

## 🆕 Nanochat Training Integration

Madellang now includes integrated nanochat training capabilities, allowing you to train your own ChatGPT-like models locally using the same AMD GPU infrastructure.

### Features
- **Multiple Training Modes**: CPU demo, single GPU, and full multi-GPU training
- **Real-time Monitoring**: Track training progress, logs, and metrics via API
- **Background Processing**: Training runs asynchronously without blocking the main service
- **Comprehensive Testing**: Unit, integration, and functional test suites

### Quick Start with Nanochat Training

1. **Setup Environment**:
   ```bash
   docker-compose exec backend bash /app/setup_nanochat.sh
   ```

2. **Start Training** (CPU Demo):
   ```bash
   curl -X POST http://localhost:8000/training/start \
     -H 'Content-Type: application/json' \
     -d '{"training_stage": "cpu_demo", "num_iterations": 10}'
   ```

3. **Monitor Progress**:
   ```bash
   curl http://localhost:8000/training/status/JOB_ID
   ```

4. **Run Tests**:
   ```bash
   docker-compose exec backend ./run_tests.sh --start all
   ```

### Training Modes

| Mode | Description | Duration | Model Size | Use Case |
|------|-------------|----------|------------|----------|
| **CPU Demo** | Minimal training for testing | ~30 min | 4 layers, ~1M params | Learning/testing |
| **Single GPU** | Full training on one GPU | ~4-8 hours | 20 layers, ~500M params | Production models |
| **Full Training** | Multi-GPU training | ~24-48 hours | 32 layers, ~1.9B params | State-of-the-art models |

### API Endpoints

- `POST /training/start` - Start a training job
- `GET /training/status/{job_id}` - Get training progress
- `GET /training/logs/{job_id}` - Get training logs
- `POST /training/stop/{job_id}` - Stop a training job
- `GET /training/jobs` - List all training jobs
- `GET /training/config/templates` - Get predefined configurations

For detailed documentation, see:
- [Nanochat Integration Plan](NANOCHAT_INTEGRATION_PLAN.md)
- [Nanochat Setup Guide](NANOCHAT_SETUP_GUIDE.md)
- [Nanochat Test Plan](NANOCHAT_TEST_PLAN.md)
- [Nanochat Quick Reference](NANOCHAT_QUICK_REFERENCE.md)

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