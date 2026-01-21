import uuid
import asyncio
from typing import Dict, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
import logging
import json

logger = logging.getLogger(__name__)

class RoomManager:
    def __init__(self, audio_processor):
        self.rooms = {}  # Maps room_id -> list of websockets
        self.participants = {}  # Maps room_id -> {websocket: participant_info}
        self.audio_processor = audio_processor
        logger.info("Room manager initialized")
    
    def create_room(self) -> str:
        """Create a new room and return its ID"""
        room_id = str(uuid.uuid4())
        self.rooms[room_id] = []
        self.participants[room_id] = {}
        logger.info(f"Created new room: {room_id}")
        return room_id
    
    async def add_participant(self, room_id: str, websocket: WebSocket, target_lang: str):
        """Add a new participant to a room"""
        if room_id not in self.rooms:
            self.rooms[room_id] = []
            self.participants[room_id] = {}
            logger.info(f"Created new room: {room_id}")
            
        self.rooms[room_id].append(websocket)
        self.participants[room_id][websocket] = {
            "target_language": target_lang
        }
        
        logger.info(f"Added participant to room {room_id}, now {len(self.rooms[room_id])} participants")
    
    async def remove_participant(self, room_id: str, websocket: WebSocket):
        """Remove a participant from a room"""
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            self.rooms[room_id].remove(websocket)
            if websocket in self.participants[room_id]:
                del self.participants[room_id][websocket]
                
            logger.info(f"Removed participant from room {room_id}, remaining: {len(self.rooms[room_id])}")
            
            # Remove room if empty
            if len(self.rooms[room_id]) == 0:
                del self.rooms[room_id]
                del self.participants[room_id]
                logger.info(f"Removed empty room: {room_id}")
    
    def get_participant_count(self, room_id: str) -> int:
        """Get the number of participants in a room"""
        if room_id not in self.rooms:
            return 0
        return len(self.rooms[room_id])
    
    async def broadcast_participant_count(self, room_id: str):
        """Broadcast the updated participant count to all in the room"""
        if room_id not in self.rooms:
            return
            
        count = len(self.rooms[room_id])
        await self.broadcast_message(
            room_id,
            {
                "type": "participant_count",
                "count": count
            }
        )
    
    async def process_audio(self, room_id: str, sender: WebSocket, audio_data: bytes):
        """Process audio from a participant and broadcast to other participants"""
        if room_id not in self.rooms:
            return
        
        # Process audio for each target language in the room
        for recipient, target_lang in self.rooms[room_id].items():
            # Skip sender
            if recipient == sender:
                continue
            
            # Get the sender's language (assumed to be different from target)
            sender_lang = self.rooms[room_id].get(sender)
            
            # Process audio through the translation pipeline
            translated_audio = await self.audio_processor.process_audio(
                audio_data, 
                target_lang=target_lang,
                source_lang=sender_lang
            )
            
            # Skip if no audio was produced
            if not translated_audio:
                continue
                
            # Send translated audio to the recipient
            try:
                if not recipient.closed:
                    await recipient.send_bytes(translated_audio)
                else:
                    logger.warning("Attempted to send translated audio to closed WebSocket")
            except Exception as e:
                logger.error(f"Error sending translated audio: {e}")

    async def broadcast_message(self, room_id: str, message: Dict, exclude_websocket=None):
        """Broadcast a JSON message to all participants in a room"""
        if room_id not in self.rooms:
            return
            
        for websocket in self.rooms[room_id]:
            if websocket != exclude_websocket and websocket:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
                    
    async def broadcast_bytes(self, room_id: str, data: bytes, exclude_websocket=None):
        """Broadcast binary data to all participants in a room"""
        if room_id not in self.rooms:
            return
            
        for websocket in self.rooms[room_id]:
            if websocket != exclude_websocket and websocket:
                try:
                    await websocket.send_bytes(data)
                except Exception as e:
                    logger.error(f"Error broadcasting binary data: {e}")
                    
    async def broadcast_translation(self, room_id: str, sender: WebSocket, translation: Dict):
        """Broadcast translation result to all participants"""
        await self.broadcast_message(
            room_id, 
            translation,
            exclude_websocket=sender
        )

    def get_participants(self, room_id: str) -> List[WebSocket]:
        """Get all participants in a room"""
        if room_id in self.rooms:
            return self.rooms[room_id]
        return []

    async def broadcast_audio(self, room_id: str, source_websocket: WebSocket, audio_data: bytes):
        """Broadcast audio to all participants in a room except the sender"""
        if room_id not in self.rooms:
            return
        
        for websocket in self.rooms[room_id]:
            if websocket != source_websocket and websocket:  # Don't send back to sender
                try:
                    await websocket.send_bytes(audio_data)
                except Exception as e:
                    logger.error(f"Error broadcasting audio: {e}")