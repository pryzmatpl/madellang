import requests
import json

def test_text_translation():
    url = "http://localhost:8000/translate-text"
    
    test_cases = [
        {"text": "Hello, how are you?", "source_lang": "en", "target_lang": "es"},
        {"text": "Bonjour, comment ça va?", "source_lang": "fr", "target_lang": "en"}
    ]
    
    for tc in test_cases:
        response = requests.post(url, json=tc)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Translation: {tc['text']} → {result['translated_text']}")
        else:
            print(f"❌ Translation failed: {response.text}")

def test_available_languages():
    response = requests.get("http://localhost:8000/available-languages")
    if response.status_code == 200:
        languages = response.json()["languages"]
        print(f"✅ Available languages: {languages}")
    else:
        print(f"❌ Failed to get languages: {response.text}")

if __name__ == "__main__":
    test_text_translation()
    test_available_languages() 