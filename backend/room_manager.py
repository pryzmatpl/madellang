import uuid
import asyncio
from typing import Dict, List, Optional, Set
from fastapi import WebSocket

class RoomManager:
    def __init__(self, audio_processor):
        self.rooms: Dict[str, Dict[WebSocket, str]] = {}  # room_id -> {websocket -> target_language}
        self.audio_processor = audio_processor
    
    def create_room(self) -> str:
        """Create a new room and return its ID"""
        room_id = str(uuid.uuid4())
        self.rooms[room_id] = {}
        return room_id
    
    async def add_participant(self, room_id: str, websocket: WebSocket, target_lang: str):
        """Add a participant to a room"""
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        
        self.rooms[room_id][websocket] = target_lang
    
    def remove_participant(self, room_id: str, websocket: WebSocket):
        """Remove a participant from a room"""
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            del self.rooms[room_id][websocket]
            
            # Clean up empty rooms
            if not self.rooms[room_id]:
                del self.rooms[room_id]
    
    def get_participant_count(self, room_id: str) -> int:
        """Get the count of participants in a room"""
        if room_id in self.rooms:
            return len(self.rooms[room_id])
        return 0
    
    async def broadcast_participant_count(self, room_id: str):
        """Broadcast participant count update to all participants in a room"""
        if room_id not in self.rooms:
            return
        
        count = self.get_participant_count(room_id)
        message = {"type": "participants_update", "count": count}
        
        for websocket in self.rooms[room_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error broadcasting participant count: {e}")
    
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
                await recipient.send_bytes(translated_audio)
            except Exception as e:
                print(f"Error sending translated audio: {e}")

    async def broadcast(self, room_id: str, sender_id: str, message, is_binary=True):
        """Broadcast a message to all participants in a room except the sender"""
        if room_id not in self.rooms:
            return
        
        for participant_id, participant in self.rooms[room_id].items():
            if participant_id != sender_id and participant.room_id == room_id:
                try:
                    if is_binary:
                        await participant.send_bytes(message)
                    else:
                        await participant.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to participant {participant_id}: {e}")
                    # Remove participant if they disconnected
                    await self.remove_participant(room_id, participant_id)