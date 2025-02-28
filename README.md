# 🗣️ Madellang - The RT Translator and language tutor

A **real-time voice translation** web application designed for ultra-low latency communication. This app enables seamless voice translation by streaming audio to a server, translating speech into a selected language, and streaming the translated voice back to users—all within a simple, single-screen interface.

## 🌟 Features  
- **📡 WebSocket-based Real-Time Streaming** – Ensures low-latency communication.  
- **📱 QR Code for Room Access** – Instantly share room links with others.  
- **🎙️ Live Speech-to-Text + Translation + Text-to-Speech** – Supports multiple languages.  
- **🌎 Cloud API & Local AI Support** – Choose between cloud-based translation (OpenAI Whisper, Google, DeepL) or an offline model (Whisper, Vosk, Coqui TTS).  
- **🔄 Bidirectional Voice Streaming** – Speak and listen simultaneously in a conversation.  
- **🖥️ Minimalist UI** – Simple interface with a **Start** button, language dropdown, and QR code for easy access.  

## 🏗️ Architecture Overview  
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

## 🛠️ Tech Stack  
- **Frontend:** React (or Svelte) + WebRTC/WebSockets  
- **Backend:** Node.js (Express/Fastify) or Python (FastAPI)  
- **AI Services:**  
  - **Cloud APIs:** OpenAI Whisper, Google Cloud Speech, DeepL  
  - **Local Models:** Whisper (STT), Coqui TTS, Vosk (offline STT)  
- **Streaming:** WebRTC or WebSockets for real-time audio transmission  

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

    Go to http://localhost:3000 (or the appropriate port).
    Click Start, scan the QR code, and begin streaming live translations!

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

This **README.md** provides a clear overview of the project, setup instructions, tech stack, and roadmap. Let me know if you’d like to customize anything! 🚀

