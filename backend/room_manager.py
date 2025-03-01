import uuid
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket

class RoomManager:
    def __init__(self, audio_processor):
        self.rooms: Dict[str, Dict] = {}
        self.audio_processor = audio_processor
    
    async def create_room(self) -> str:
        """Create a new room with a unique ID"""
        room_id = str(uuid.uuid4())
        self.rooms[room_id] = {
            "participants": {},
            "audio_queue": asyncio.Queue()
        }
        # Start the room's audio processing task
        asyncio.create_task(self._process_room_audio(room_id))
        return room_id
    
    async def add_participant(self, room_id: str, participant_id: str, websocket: WebSocket, target_lang: str):
        """Add a participant to a room"""
        # Create room if it doesn't exist
        if room_id not in self.rooms:
            await self.create_room()
            
        # Add participant
        self.rooms[room_id]["participants"][participant_id] = {
            "websocket": websocket,
            "target_lang": target_lang
        }
        
        # Notify all participants about the update
        await self._broadcast_participants_update(room_id)
    
    async def remove_participant(self, room_id: str, participant_id: str):
        """Remove a participant from a room"""
        if room_id in self.rooms and participant_id in self.rooms[room_id]["participants"]:
            del self.rooms[room_id]["participants"][participant_id]
            
            # Remove room if empty
            if not self.rooms[room_id]["participants"]:
                del self.rooms[room_id]
            else:
                # Notify remaining participants
                await self._broadcast_participants_update(room_id)
    
    async def get_participants(self, room_id: str) -> List[str]:
        """Get all participants in a room"""
        if room_id in self.rooms:
            return list(self.rooms[room_id]["participants"].keys())
        return []
    
    async def process_audio(self, room_id: str, sender_id: str, audio_data: bytes):
        """Process audio from a participant and queue it for translation"""
        if room_id in self.rooms:
            # Add to the room's audio queue
            await self.rooms[room_id]["audio_queue"].put({
                "sender_id": sender_id,
                "audio_data": audio_data
            })
    
    async def _process_room_audio(self, room_id: str):
        """Process audio in the room's queue continuously"""
        while room_id in self.rooms:
            try:
                # Get the next audio chunk
                audio_item = await self.rooms[room_id]["audio_queue"].get()
                sender_id = audio_item["sender_id"]
                audio_data = audio_item["audio_data"]
                
                # Skip processing if room no longer exists
                if room_id not in self.rooms:
                    break
                
                # Process for each participant with their target language
                for participant_id, participant_info in self.rooms[room_id]["participants"].items():
                    # Skip sending back to original sender
                    if participant_id == sender_id:
                        continue
                    
                    target_lang = participant_info["target_lang"]
                    websocket = participant_info["websocket"]
                    
                    # Process audio with translation pipeline
                    translated_audio = await self.audio_processor.process_audio(
                        audio_data,
                        target_lang
                    )
                    
                    # Send translated audio to the participant
                    await websocket.send_bytes(translated_audio)
                
            except Exception as e:
                print(f"Error processing audio: {e}")
                await asyncio.sleep(0.1)
    
    async def _broadcast_participants_update(self, room_id: str):
        """Broadcast the number of participants to everyone in the room"""
        if room_id in self.rooms:
            participant_count = len(self.rooms[room_id]["participants"])
            for participant_info in self.rooms[room_id]["participants"].values():
                try:
                    await participant_info["websocket"].send_json({
                        "type": "participants_update",
                        "count": participant_count
                    })
                except Exception as e:
                    print(f"Error broadcasting update: {e}")