# Real-time Voice Translation App

A minimalistic, high-performance web application for real-time voice translation with ultra-low latency.

## Features

- Create unique rooms with shareable QR codes
- Real-time audio streaming via WebSockets
- Speech-to-Text, Translation, and Text-to-Speech pipeline
- Support for multiple languages
- Ultra-low latency design

## Technical Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Real-time Communication**: Socket.IO
- **Audio Processing**: Web Audio API
- **QR Code Generation**: qrcode.react

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

### Server Setup (Mock Implementation)

The project includes a mock server implementation for demonstration purposes. In a production environment, you would need to implement:

1. A proper WebSocket server
2. Integration with STT/TTS services (e.g., OpenAI Whisper, Google Cloud, DeepL)
3. Audio processing pipeline

To run the mock server:

```bash
cd server
npm install
node index.js
```

## How It Works

1. **Room Creation**: Users can create a unique room, generating a shareable link with an embedded QR code.
2. **WebSocket Connection**: When a user joins a room, a WebSocket connection is established.
3. **Audio Streaming**: The user's microphone input is captured and streamed to the server.
4. **Translation Pipeline**:
   - Speech-to-Text: Convert incoming speech to text
   - Translation: Translate text into the selected target language
   - Text-to-Speech: Convert translated text back into speech
5. **Real-time Playback**: The translated speech is streamed back to connected users in real-time.

## Implementation Notes

- The current implementation includes a mock server for demonstration purposes.
- In a production environment, you would need to implement proper STT/TTS services.
- The application is designed to be lightweight and focused on core functionality.
- WebRTC could be used for even lower latency in a production implementation.

## License

MIT