import requests

def test_room_creation():
    response = requests.get("http://localhost:8000/create-room")
    if response.status_code == 200:
        room_id = response.json()["room_id"]
        print(f"✅ Created room: {room_id}")
    else:
        print(f"❌ Failed to create room: {response.text}")

if __name__ == "__main__":
    test_room_creation() 