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
- **Structure**:
  - `main.py`: FastAPI app and endpoints
  - `room_manager.py`: Room and participant logic
  - `audio_processor.py`: Audio stream processing
  - `model_manager.py`: AI model orchestration
  - `translation_service.py`: Translation logic
  - `tests/`: Automated test suite for core features

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

## Usage

1. Create or join a room (QR code or link)
2. Select your target language
3. Grant microphone permissions
4. Click "Start Recording" and begin speaking
5. Hear translated speech from other participants in your chosen language

---

## API & Integration

- **WebSocket endpoint**: `/ws/{room_id}?target_lang={language_code}`
- **REST endpoints**: Room creation, participant count, health check
- **Frontend integration**: See backend/README.md for code samples

---

## Testing

- Backend: Run tests in `backend/tests/`
- Frontend: Run `npm test` in `frontend/`

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