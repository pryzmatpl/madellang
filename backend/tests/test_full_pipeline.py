import asyncio
import websockets
import json
import wave
import os
import time
import requests
import argparse
import sys

async def test_websocket_audio_translation(room_id="test-room", target_lang="es", audio_file="test.wav"):
    """Test audio translation via WebSocket"""
    # Check if system is ready
    try:
        response = requests.get("http://localhost:8000/system-info")
        if response.status_code != 200:
            print(f"❌ Backend not ready: {response.status_code}")
            return False
        
        system_info = response.json()
        print(f"🖥️ System Info: {system_info}")
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
        return False
    
    # Load audio file
    if not os.path.exists(audio_file):
        print(f"❌ Audio file not found: {audio_file}")
        return False
    
    with wave.open(audio_file, 'rb') as wav_file:
        audio_data = wav_file.readframes(wav_file.getnframes())
    
    # Connect to WebSocket
    uri = f"ws://localhost:8000/ws/{room_id}?target_lang={target_lang}"
    print(f"🔌 Connecting to {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Wait for connection confirmation
            response = await websocket.recv()
            data = json.loads(response)
            print(f"✅ Connected: {data}")
            
            # Create another client to receive the translation
            async def receive_translation():
                receiver_uri = f"ws://localhost:8000/ws/{room_id}?target_lang=en"  # Receiver wants English
                async with websockets.connect(receiver_uri) as receiver:
                    # Wait for connection confirmation
                    response = await receiver.recv()
                    print(f"✅ Receiver connected: {json.loads(response)}")
                    
                    # Wait for translation
                    try:
                        # Set a timeout
                        translation = await asyncio.wait_for(receiver.recv(), timeout=30)
                        print(f"📢 Received translation: {len(translation)} bytes")
                        return True
                    except asyncio.TimeoutError:
                        print("❌ No translation received within timeout")
                        return False
            
            # Start receiver task
            receiver_task = asyncio.create_task(receive_translation())
            
            # Send audio in chunks to simulate real-time recording
            chunk_size = 4096
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i:i+chunk_size]
                print(f"📤 Sending chunk {i//chunk_size + 1}/{len(audio_data)//chunk_size + 1} ({len(chunk)} bytes)")
                await websocket.send(chunk)
                # Small delay to simulate real-time
                await asyncio.sleep(0.1)
            
            # Wait for translation to be received
            result = await receiver_task
            
            return result
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        return False

def test_text_translation(text="Hello, how are you?", source_lang="en", target_lang="es"):
    """Test direct text translation API"""
    try:
        response = requests.post(
            "http://localhost:8000/translate-text",
            json={
                "text": text,
                "source_lang": source_lang,
                "target_lang": target_lang
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Text translation failed: {response.status_code} {response.text}")
            return False
        
        result = response.json()
        print(f"✅ Text translated: '{text}' → '{result['translated_text']}'")
        return True
    except Exception as e:
        print(f"❌ Text translation error: {e}")
        return False

async def main():
    parser = argparse.ArgumentParser(description="Test the audio translation pipeline")
    parser.add_argument("--audio", default="test.wav", help="Path to test audio file")
    parser.add_argument("--lang", default="es", help="Target language code")
    parser.add_argument("--room", default="test-room", help="Room ID for WebSocket test")
    parser.add_argument("--text", action="store_true", help="Run text translation test")
    parser.add_argument("--websocket", action="store_true", help="Run WebSocket audio test")
    
    args = parser.parse_args()
    
    # Default to running both tests if none specified
    run_text = args.text or not args.websocket
    run_websocket = args.websocket or not args.text
    
    success = True
    
    # Run text translation test
    if run_text:
        if not test_text_translation(target_lang=args.lang):
            success = False
    
    # Run WebSocket audio test
    if run_websocket:
        if not await test_websocket_audio_translation(room_id=args.room, target_lang=args.lang, audio_file=args.audio):
            success = False
    
    if success:
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed")
        return 1

if __name__ == "__main__":
    asyncio.run(main()) 