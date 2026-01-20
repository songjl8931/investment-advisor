import requests

def test_auth_me():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc2ODk2NzUzOH0.szyKY1gFrXHiIooNyNHQN6cygx3ToceY_IjadRPzYQU"
    url = "http://localhost:8000/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        print(f"Requesting {url}...")
        resp = requests.get(url, headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_auth_me()
