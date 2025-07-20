import requests
import json

url = "http://localhost:8000/api/chat"
headers = {"Content-Type": "application/json"}

# Test with explicit generation request
data = {
    "message": "Perfect! Please generate the scenario now. I want to create this highway overtaking scenario.",
    "conversation_history": [
        {
            "role": "user",
            "content": "I want to create a highway overtaking scenario with a car overtaking a slow truck"
        },
        {
            "role": "assistant",
            "content": "Great! I can help you create a highway overtaking scenario. Let me gather some details about your scenario..."
        },
        {
            "role": "user",
            "content": "The ego vehicle is a Tesla Model 3 driving at 120 km/h on a 3-lane highway. There is a slow truck in the right lane going 80 km/h. The Tesla needs to overtake the truck by changing to the left lane."
        },
        {
            "role": "assistant",
            "content": "Perfect! I have enough information to create your highway overtaking scenario. The scenario will involve a Tesla Model 3 on a 3-lane highway, starting in the right lane behind a slow-moving truck. The Tesla will be traveling at 120 km/h, while the truck is moving at 80 km/h. The main action will be the Tesla overtaking the truck by changing to the left lane. Would you like me to generate the scenario for you now?"
        }
    ],
    "session_id": "test-session-123"
}

try:
    response = requests.post(url, headers=headers, json=data, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")