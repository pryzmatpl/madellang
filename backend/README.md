# Voice Translation Application

A real-time voice translation backend built with FastAPI, WebSockets, and AI services that enables multilingual communication.

## Features

- Real-time voice translation using WebSockets
- Support for multiple languages
- Room-based system for group conversations
- Configurable to use either cloud APIs or local models
- Complete audio processing pipeline: Speech-to-Text → Translation → Text-to-Speech

## Architecture

The backend consists of four main components:

1. **WebSocket Server**: Handles real-time bidirectional communication with clients
2. **Room Manager**: Creates and manages translation rooms
3. **Audio Processing Pipeline**: Processes incoming audio streams
4. **Model Manager**: Handles different AI models (local and API-based)

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

- `GET /` - Health check endpoint
- `GET /create-room` - Create a new translation room
- `GET /rooms/{room_id}/participants` - Get count of participants in a room
- `WebSocket /ws/{room_id}` - WebSocket connection for real-time translation

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

## Project Structure

```
voice-translation-app/
├── main.py              # FastAPI application and endpoints
├── room_manager.py      # Room and participant management
├── audio_processor.py   # Audio processing pipeline
├── model_manager.py     # AI model management
└── requirements.txt     # Dependencies
```

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.