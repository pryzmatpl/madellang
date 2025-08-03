import sys
# Add the deps directory to the Python path
sys.path.insert(0, "./deps")

# Import the custom torch loader to set up paths
from torch_loader import get_device_info

# Import AMD GPU utilities
from amd_gpu_utils import configure_gpu_environment

# Configure GPU environment early in the startup
gpu_config = configure_gpu_environment()

# Import other dependencies
sys.path.append("./deps/whisper")
sys.path.append("./deps/audio")

import whisper
import torch
import torchaudio
import logging
import json
import websockets
from websockets.exceptions import ConnectionClosedError

# Print diagnostic information
torch_info = get_device_info()
print(f"PyTorch version: {torch_info['version']}")
print(f"ROCm version: {torch_info['rocm_version']}")
print(f"Device available: {torch_info['device_name']}")
print(f"Whisper version: {whisper.__version__}")

import uuid
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from typing import Dict, List, Optional
from pydantic import BaseModel
from pathlib import Path
import logger_config
import time

# Setup logging
logger = logging.getLogger(__name__)

from room_manager import RoomManager
from audio_processor import AudioProcessor
from model_manager import ModelManager
from translation_service import TranslationService
from model_selector import select_appropriate_whisper_model

# Create FastAPI app
app = FastAPI()

# Update CORS settings to explicitly allow WebSocket connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

# Initialize the service components - fix the initialization order
translation_service = TranslationService()
model_manager = ModelManager()
audio_processor = AudioProcessor(model_manager, translation_service)
room_manager = RoomManager(audio_processor)  # Pass audio_processor to RoomManager

# Define request/response models
class TextTranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

@app.websocket("/ws/test")
async def websocket_test(websocket: WebSocket):
    """Simple WebSocket test endpoint"""
    await websocket.accept()
    logger.info("Test WebSocket connection accepted")
    
    try:
        await websocket.send_text("Hello from server - connection established")
        
        # Use a separate receive task to handle disconnections properly
        while True:
            try:
                # Create a task for receiving data
                receive_task = asyncio.create_task(websocket.receive_text())
                
                # Wait for message with timeout
                try:
                    data = await asyncio.wait_for(receive_task, timeout=5.0)
                    await websocket.send_text(f"Echo: {data}")
                except asyncio.TimeoutError:
                    # Send ping on timeout
                    await websocket.send_text("ping")
                    continue
                    
            except WebSocketDisconnect:
                logger.info("Test WebSocket disconnected")
                break
                
            except Exception as e:
                logger.error(f"Test WebSocket error: {str(e)}")
                if "disconnect" in str(e).lower():
                    break
                
    except Exception as e:
        logger.error(f"Test WebSocket error: {str(e)}")
        
    logger.info("Test WebSocket connection closed")

# Add separate audio handling coroutine
async def handle_audio_messages(websocket: WebSocket, room_id: str, user_id: str, target_lang: str):
    while True:
        try:
            audio_data = await websocket.receive_bytes()
            result = await audio_processor.process_audio_chunk(
                room_id=room_id,
                user_id=user_id,
                audio_chunk=audio_data,
                target_lang=target_lang
            )
            
            if result:
                if "audio" in result:
                    await websocket.send_bytes(result["audio"])
                else:
                    await room_manager.broadcast_translation(room_id, websocket, result)
                    
        except WebSocketDisconnect:
            break
        except Exception as e:
            logger.error(f"Audio processing error: {str(e)}")
            continue

# Add a WebSocket connection manager to handle connections more reliably
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                
    async def send_bytes(self, websocket: WebSocket, data: bytes):
        try:
            await websocket.send_bytes(data)
        except Exception as e:
            logger.error(f"Error sending bytes: {e}")
            
    async def send_json(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_json(data)
        except Exception as e:
            logger.error(f"Error sending JSON: {e}")

# Initialize the connection manager
connection_manager = ConnectionManager()

from fastapi import WebSocketDisconnect
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket endpoint with optimized connection flow"""
    # Accept connection
    await websocket.accept()
    logger.info(f"Connection accepted for room {room_id}")
    
    # Get language and create user ID
    target_lang = websocket.query_params.get("target_lang", "en") 
    user_id = str(uuid.uuid4())
    connection_added = False
    disconnected = False
    last_ping_time = time.time()
    
    try:
        # Send welcome message FIRST, before adding to room
        try:
            await websocket.send_json({
                "type": "connection_established",
                "room_id": room_id,
                "user_id": user_id
            })
            logger.debug(f"Sent connection_established message to {user_id}")
        except Exception as e:
            logger.warning(f"Failed to send welcome message: {str(e)}")
            disconnected = True

        # Only proceed if not disconnected
        if not disconnected:
            # Now add to room after confirming connection is working
            await room_manager.add_participant(room_id, websocket, target_lang)
            connection_added = True
            logger.info(f"User {user_id} joined room {room_id}")
            
            # Message handling loop with additional disconnect check
            while not disconnected:
                try:
                    # Use wait_for with a shorter timeout
                    receive_task = asyncio.create_task(websocket.receive())
                    done, pending = await asyncio.wait(
                        [receive_task], 
                        timeout=10.0,
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    # Cancel pending tasks
                    for task in pending:
                        task.cancel()
                        
                    if receive_task in done:
                        # We got a message
                        data = receive_task.result()
                        last_ping_time = time.time()
                        
                        # Process text messages (ping, etc.)
                        if "text" in data:
                            try:
                                msg = json.loads(data["text"])
                                msg_type = msg.get("type", "")
                                
                                if msg_type == "ping":
                                    logger.debug(f"Received ping from {user_id}, sending pong")
                                    await websocket.send_json({"type": "pong"})
                                elif msg_type == "close":
                                    logger.info(f"Client {user_id} requested closure")
                                    disconnected = True
                            except json.JSONDecodeError:
                                logger.warning(f"Received invalid JSON: {data['text']}")
                            except Exception as e:
                                logger.error(f"Error processing text message: {str(e)}")
                                disconnected = True
                        
                        # Handle audio data
                        if "bytes" in data and not disconnected:
                            audio_data = data["bytes"]
                            logger.debug(f"Received {len(audio_data)} bytes of audio from {user_id}")
                            
                            # Process audio in a dedicated task to avoid blocking
                            asyncio.create_task(
                                process_audio_data(room_id, user_id, audio_data, websocket, target_lang)
                            )
                    else:
                        # Timeout occurred, send ping
                        if time.time() - last_ping_time > 30:
                            logger.warning(f"No activity for 30s, closing connection for {user_id}")
                            disconnected = True
                        else:
                            try:
                                await websocket.send_json({"type": "ping"})
                                logger.debug(f"Sent keep-alive ping to {user_id}")
                            except Exception:
                                disconnected = True
                except WebSocketDisconnect:
                    logger.info(f"Client {user_id} disconnected abruptly")
                    disconnected = True
                except asyncio.CancelledError:
                    logger.info(f"Task for {user_id} was cancelled")
                    disconnected = True
                
                except Exception as e:
                    logger.error(f"Unexpected error in WebSocket handler: {str(e)}")
                    disconnected = True
                    
    except Exception as e:
        logger.error(f"Error in WebSocket endpoint: {str(e)}")
        
    finally:
        # Cleanup resources
        if connection_added:
            try:
                await room_manager.remove_participant(room_id, websocket)
                logger.info(f"User {user_id} removed from room {room_id}")
            except Exception as e:
                logger.error(f"Error removing from room: {str(e)}")

# REST API endpoints
@app.get("/create-room")
async def create_room():
    """Create a new room and return its ID"""
    room_id = f"room-{uuid.uuid4().hex[:6]}"
    return {"room_id": room_id}

@app.get("/available-languages")
async def get_available_languages():
    """Get all available languages for translation"""
    try:
        languages = translation_service.get_available_languages()
        return {"languages": languages}
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        # Return a minimal set of languages if there's an error
        return {"languages": {"en": "English", "es": "Spanish", "fr": "French"}}

@app.post("/translate-text")
async def translate_text(request: TextTranslationRequest):
    """Translate text from one language to another"""
    try:
        translated = translation_service.translate_text(
            request.text,
            request.source_lang,
            request.target_lang
        )
        return {"translated_text": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@app.get("/health")
async def health_check():
    """Simple health check endpoint for testing connection"""
    return {
        "status": "ok",
        "cors": "enabled",
        "api_version": "1.0",
        "websocket": "enabled"
    }

@app.get("/system-info")
async def system_info():
    """Return information about the system configuration"""
    info = {
        "pytorch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "whisper_version": whisper.__version__,
    }
    
    # Add GPU info if available
    if torch.cuda.is_available():
        try:
            info["device_name"] = torch.cuda.get_device_name(0)
            info["device_count"] = torch.cuda.device_count()
            info["cuda_version"] = torch.version.cuda
            
            # Check if it's actually an AMD GPU
            if hasattr(torch.version, 'hip') and torch.version.hip:
                info["gpu_type"] = "AMD (ROCm/HIP)"
                info["rocm_version"] = torch.version.hip
            else:
                info["gpu_type"] = "NVIDIA (CUDA)"
        except Exception as e:
            info["gpu_error"] = str(e)
    
    # Add selected model info
    info["whisper_model"] = select_appropriate_whisper_model()
    
    return info

@app.get("/toggle-mirror-mode")
async def toggle_mirror_mode(enabled: bool = False):
    """Toggle audio mirroring mode"""
    # Convert string to boolean if needed
    if isinstance(enabled, str):
        enabled = enabled.lower() == "true"
    
    mirror_enabled = audio_processor.toggle_mirror_mode(enabled)
    return {"mirror_mode": mirror_enabled}

@app.get("/test-websocket")
async def test_websocket():
    """Test if WebSocket connections are working"""
    html_content = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>WebSocket Test</title>
        </head>
        <body>
            <h1>WebSocket Test</h1>
            <div id="messages"></div>
            <script>
                const ws = new WebSocket("ws://localhost:8000/ws/test");
                ws.onopen = function() {
                    document.getElementById("messages").innerHTML += "<p>Connection opened</p>";
                };
                ws.onmessage = function(event) {
                    document.getElementById("messages").innerHTML += "<p>Received: " + event.data + "</p>";
                };
                ws.onerror = function(error) {
                    document.getElementById("messages").innerHTML += "<p>Error: " + error + "</p>";
                };
                ws.onclose = function() {
                    document.getElementById("messages").innerHTML += "<p>Connection closed</p>";
                };
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# Update the audio processing function in main.py
async def process_audio_data(room_id: str, user_id: str, audio_data: bytes, websocket: WebSocket, target_lang: str):
    """Process audio data and broadcast results to room participants"""
    try:
        if audio_processor.mirror_mode:
            logger.info(f"Mirror mode active: echoing {len(audio_data)} bytes back to sender")
            # In mirror mode, directly send the audio back to the same client
            # Convert to WAV format to make it easier for browsers to play
            if audio_processor.attatch_wav_header:
                sample_rate = 16000
                channels = 1
                bits = 16

                # Create WAV header
                header = bytearray()
                # RIFF header
                header.extend(b'RIFF')
                header.extend((36 + len(audio_data)).to_bytes(4, 'little'))  # File size
                header.extend(b'WAVE')
                # fmt chunk
                header.extend(b'fmt ')
                header.extend((16).to_bytes(4, 'little'))  # Chunk size
                header.extend((1).to_bytes(2, 'little'))   # Format code (PCM)
                header.extend((channels).to_bytes(2, 'little'))  # Channels
                header.extend((sample_rate).to_bytes(4, 'little'))  # Sample rate
                byte_rate = sample_rate * channels * bits // 8
                header.extend((byte_rate).to_bytes(4, 'little'))  # Byte rate
                block_align = channels * bits // 8
                header.extend((block_align).to_bytes(2, 'little'))  # Block align
                header.extend((bits).to_bytes(2, 'little'))  # Bits per sample
                # data chunk
                header.extend(b'data')
                header.extend((len(audio_data)).to_bytes(4, 'little'))  # Data size

                # Combine header and audio data
                wav_data = header + audio_data
                await websocket.send_bytes(wav_data)
                # Send formatted WAV
            else:
                await websocket.send_bytes(audio_data)
            return

        # Normal translation mode logic
        result = await audio_processor.process_audio_chunk(
            room_id=room_id,
            user_id=user_id,
            audio_chunk=audio_data,
            target_lang=target_lang
        )
        
        if result:
            if isinstance(result, dict) and "audio" in result:
                await websocket.send_bytes(result["audio"])
            elif isinstance(result, dict):
                await room_manager.broadcast_translation(room_id, websocket, result)
                
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")