# 🗣️ Madellang Frontend: Voice Translation + AI Training UI

A **comprehensive React frontend** for real-time voice translation AND AI model training. This app enables seamless voice translation by streaming audio to a server, translating speech into a selected language, and provides a complete web interface for training ChatGPT-like models locally with AMD GPU acceleration.

## 🌟 Features  

### 🎤 **Voice Translation**
- **📡 WebSocket-based Real-Time Streaming** – Ensures low-latency communication.  
- **📱 QR Code for Room Access** – Instantly share room links with others.  
- **🎙️ Live Speech-to-Text + Translation + Text-to-Speech** – Supports multiple languages.  
- **🌎 Cloud API & Local AI Support** – Choose between cloud-based translation (OpenAI Whisper, Google, DeepL) or an offline model (Whisper, Vosk, Coqui TTS).  
- **🔄 Bidirectional Voice Streaming** – Speak and listen simultaneously in a conversation.  
- **🖥️ Minimalist UI** – Simple interface with a **Start** button, language dropdown, and QR code for easy access.  

### 🧠 **AI Model Training** 
- **🆕 Complete Training UI** – Full web interface for managing nanochat training jobs
- **🆕 Real-time Monitoring** – Track training progress, logs, and metrics in real-time
- **🆕 Multiple Training Modes** – CPU demo, single GPU, and full multi-GPU training
- **🆕 Job Management** – Start, stop, monitor, and download trained models
- **🆕 Configuration Templates** – Predefined training configurations
- **🆕 Training Metrics** – Comprehensive statistics and performance analytics
- **🆕 Log Viewer** – Real-time training logs with download capability

## 🏗️ Architecture Overview  

### 🎤 **Voice Translation**
1. **Frontend (Web App)**  
   - Generates **QR codes** for room sharing.  
   - Establishes **WebSocket connections** to the server.  
   - Streams **audio** to the server for real-time translation.  
   - Plays back the translated speech in the selected language.  

2. **Backend (Server)**  
   - Handles **WebSocket communication** for audio streaming.  
   - Processes speech using either a **cloud API** (e.g., Google Speech-to-Text) or a **local AI model** (e.g., Whisper).  
   - Translates text to the chosen **target language**.  
   - Converts translated text back into **speech** and streams it to clients.  

### 🧠 **AI Training Integration**
1. **Training Dashboard** (`/training`)
   - Complete web interface for managing training jobs
   - Real-time progress monitoring and metrics
   - Configuration templates and job management

2. **Training Service** (Backend)
   - Complete nanochat integration in `deps/nanochat/`
   - AMD GPU acceleration with ROCm support
   - Background training job processing

## 🛠️ Tech Stack  

### 🎤 **Voice Translation**
- **Frontend:** React + TypeScript + WebRTC/WebSockets  
- **Backend:** Python (FastAPI) + WebSockets
- **AI Services:**  
  - **Cloud APIs:** OpenAI Whisper, Google Cloud Speech, DeepL  
  - **Local Models:** Whisper (STT), Coqui TTS, Vosk (offline STT)  
- **Streaming:** WebRTC or WebSockets for real-time audio transmission  

### 🧠 **AI Training**
- **Frontend:** React + TypeScript + shadcn/ui components
- **Backend:** Python (FastAPI) + nanochat integration
- **Training:** PyTorch + ROCm (AMD GPU acceleration)
- **Tokenization:** Rust-based BPE tokenizer
- **Monitoring:** Real-time progress tracking and metrics

## 🚀 Getting Started  

### 1️⃣ Clone the Repository  
```sh
git clone https://github.com/yourusername/live-voice-translator.git
cd live-voice-translator
```

### 2️⃣ Install Dependencies
Frontend

```sh
cd frontend
npm install
```

Backend
```sh
cd backend
npm install
```

(or use Python pip install -r requirements.txt if using FastAPI instead of Node.js)

### 3️⃣ Run the Application
Start Backend Server
```sh
cd backend
npm start
```
(or python main.py for FastAPI implementation)

Start Frontend
```sh
cd frontend
npm run dev
```

### 4️⃣ Open the Web App

    Go to http://localhost:3000 for voice translation
    Go to http://localhost:3000/training for AI model training
    Click Start, scan the QR code, and begin streaming live translations!

## 🧠 **Training UI Features**

### **Training Dashboard** (`/training`)
- **Job Management**: Start, stop, monitor training jobs
- **Real-time Monitoring**: Progress bars, status indicators, logs
- **Configuration Templates**: Predefined training configurations
- **Metrics & Analytics**: Training statistics and performance data

### **Training Components**
- `TrainingDashboard.tsx` - Main training interface
- `TrainingConfigForm.tsx` - Configuration form with templates
- `TrainingLogs.tsx` - Real-time logs viewer
- `TrainingMetrics.tsx` - Training statistics and analytics
- `TrainingServiceTest.tsx` - Development test component

### **Training Modes**
| Mode | Description | Duration | Model Size | Use Case |
|------|-------------|----------|------------|----------|
| **CPU Demo** | Minimal training for testing | ~30 min | 4 layers, ~1M params | Learning/testing |
| **Single GPU** | Full training on one GPU | ~4-8 hours | 20 layers, ~500M params | Production models |
| **Full Training** | Multi-GPU training | ~24-48 hours | 32 layers, ~1.9B params | State-of-the-art models |

### **API Integration**
- **Training Service**: Complete API for managing training jobs
- **Real-time Updates**: Automatic polling for progress updates
- **Error Handling**: Comprehensive error management and recovery
- **Log Streaming**: Real-time training logs with download capability

### Configuration

    .env file for API keys (e.g., Google, OpenAI).
    Configure local AI model paths if using an offline model.

### 📌 Roadmap

> ✅ MVP with basic real-time translation
> 🔲 Improve local AI model support
> 🔲 Add multi-user voice channels
> 🔲 Enhance mobile support & PWA integration

### 🤝 Contributing

Contributions are welcome! Fork the repo, make your changes, and submit a PR.

### 📜 License

MIT License © 2025 Piotr Slupski

🚀 Enjoy real-time voice translation with low latency and seamless streaming!


---

This **README.md** provides a clear overview of the project, setup instructions, tech stack, and roadmap. Let me know if you'd like to customize anything! 🚀

# Voice Translation App Frontend

This is the React frontend for the Voice Translation application. It provides a user interface for real-time voice translation using WebSockets.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Structure

- `src/components/` - UI components
- `src/services/` - Service layer for API communication
- `src/tests/` - Test files

