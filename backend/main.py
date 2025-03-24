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

# Setup logging
logger = logging.getLogger(__name__)

from room_manager import RoomManager
from audio_processor import AudioProcessor
from model_manager import ModelManager
from translation_service import TranslationService
from model_selector import select_appropriate_whisper_model

# Create FastAPI app
app = FastAPI()

# Update CORS settings to be more permissive during development
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
    try:
        await websocket.send_text(f"Connection established. Server is running.")
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        logger.info("WebSocket test client disconnected")

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """Main WebSocket endpoint for real-time translation"""
    # Get target language from query parameters
    target_lang = websocket.query_params.get("target_lang", "en")
    
    # Accept connection
    await websocket.accept()
    
    # Generate user ID
    user_id = str(uuid.uuid4())
    
    # Add to room
    await room_manager.add_participant(room_id, websocket, target_lang)
    logger.info(f"User {user_id} joined room {room_id}")
    
    try:
        # Notify client about successful connection
        await websocket.send_json({
            "type": "connection_established",
            "room_id": room_id,
            "user_id": user_id
        })
        
        # Broadcast participant count
        await room_manager.broadcast_participant_count(room_id)
        
        # Handle incoming messages
        while True:
            try:
                # Receive binary data (audio)
                audio_data = await websocket.receive_bytes()
                
                # Process the audio chunk
                result = await audio_processor.process_audio_chunk(
                    room_id=room_id,
                    user_id=user_id,
                    audio_chunk=audio_data,
                    target_lang=target_lang
                )
                
                # If the chunk was processed (not just buffered)
                if result:
                    # Broadcast the translation to others in the room
                    await room_manager.broadcast_translation(
                        room_id=room_id,
                        sender=websocket,
                        translation=result
                    )
            except Exception as e:
                logger.error(f"Error processing audio: {e}")
                continue
                
    except WebSocketDisconnect:
        # Remove from room
        room_manager.remove_participant(room_id, websocket)
        logger.info(f"User {user_id} left room {room_id}")
        
        # Broadcast updated participant count
        await room_manager.broadcast_participant_count(room_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

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