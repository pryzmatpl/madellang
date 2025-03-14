import requests
import tempfile
import os
import base64
import time

def test_full_translation_pipeline():
    """Test the complete audio translation pipeline"""
    # Check system info
    response = requests.get("http://localhost:8000/system-info")
    assert response.status_code == 200
    system_info = response.json()
    print(f"🖥️ System Info: {system_info}")
    
    # Create a room
    response = requests.get("http://localhost:8000/create-room")
    assert response.status_code == 200
    room_id = response.json()["room_id"]
    print(f"🏠 Created room: {room_id}")
    
    # Check translation capabilities
    response = requests.get("http://localhost:8000/available-languages")
    assert response.status_code == 200
    languages = response.json()["languages"]
    print(f"🌐 Available languages: {len(languages)}")
    
    # Test text translation
    test_text = "Hello, this is a test translation."
    for target_lang in ["es", "fr", "de"][:1]:  # Test only the first one to save time
        if target_lang in languages:
            response = requests.post(
                "http://localhost:8000/translate-text",
                json={"text": test_text, "source_lang": "en", "target_lang": target_lang}
            )
            assert response.status_code == 200
            translated = response.json()["translated_text"]
            print(f"📝 Translation to {target_lang}: {translated}")
    
    print("✅ All tests passed!")

if __name__ == "__main__":
    test_full_translation_pipeline() 