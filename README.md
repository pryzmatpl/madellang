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
   git clone https://github.com/yourusername/voice-translation-app.git
   cd voice-translation-app
   ```

2. Adjust environment variables in docker-compose.yml if needed:
   - Set the appropriate GPU architecture version in HSA_OVERRIDE_GFX_VERSION
   - Change WHISPER_MODEL to match your GPU capabilities (tiny, small, medium)

3. Start the application:
   ```bash
   docker-compose up -d
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