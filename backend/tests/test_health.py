import requests

def test_health():
    response = requests.get("http://localhost:8000/")
    assert response.status_code == 200
    assert "message" in response.json()
    print("✅ Health check passed!")

if __name__ == "__main__":
    test_health() 