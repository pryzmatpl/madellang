import sys
sys.path.append("./deps/whisper")
sys.path.append("./deps/pytorch")
sys.path.append("./deps/audio")
import whisper
import torchaudio
import torch
print(whisper.__version__)  # Should print the version or commit hash
print(torchaudio.__version__)
print(torch.__version__)
from fastapi.openapi.utils import get_openapi

import uuid
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import numpy as np
from pydantic import BaseModel

from room_manager import RoomManager
from audio_processor import AudioProcessor
from model_manager import ModelManager
from translation_service import TranslationService

app = FastAPI()

# Add CORS to allow connections from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request/response models
class TextTranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class TextTranslationResponse(BaseModel):
    translated_text: str

# Initialize components
translation_service = TranslationService()
model_manager = ModelManager()
audio_processor = AudioProcessor(model_manager, translation_service)
room_manager = RoomManager(audio_processor)

@app.get("/")
async def root():
    return {"message": "Voice Translation API is running"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    # Get target language from query parameters
    target_lang = websocket.query_params.get("target_lang", "en")
    
    # Accept connection
    await websocket.accept()
    
    # Generate user ID
    user_id = str(uuid.uuid4())
    
    # Add to room
    room_manager.add_participant(room_id, user_id, websocket)
    
    try:
        while True:
            # Receive audio chunk
            audio_chunk = await websocket.receive_bytes()
            
            # Process chunk
            result = await audio_processor.process_audio_chunk(
                room_id, user_id, audio_chunk, target_lang
            )
            
            # If we have a result, send to all other participants
            if result and result.get("translated_text"):
                # You might want to convert text to speech here
                # Then broadcast to other participants
                await room_manager.broadcast(
                    room_id, user_id, result["translated_text"], is_binary=False
                )
    except WebSocketDisconnect:
        room_manager.remove_participant(room_id, user_id)

@app.get("/create-room")
async def create_room():
    """
    Create a new room and return its ID
    """
    room_id = await room_manager.create_room()
    return {"room_id": room_id}

@app.get("/rooms/{room_id}/participants")
async def get_room_participants(room_id: str):
    """
    Get the number of participants in a room
    """
    participants = await room_manager.get_participants(room_id)
    return {"participants": len(participants)}

@app.get("/available-languages")
async def get_available_languages():
    """Get all available languages for translation"""
    languages = translation_service.get_available_languages()
    return {"languages": languages}

@app.post("/translate-text")
async def translate_text(request: TextTranslationRequest):
    """Translate text between languages"""
    translated = translation_service.translate_text(
        request.text,
        request.source_lang,
        request.target_lang
    )
    return TextTranslationResponse(translated_text=translated)
    
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Live Voice Translation API",
        version="1.0.0",
        description="API for real-time voice translation via WebSockets.",
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi


# Run with: uvicorn main:app --host 0.0.0.0 --port 8000