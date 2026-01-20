import requests

def test_tracking():
    # Admin token (from previous login)
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc2ODk2NzUzOH0.szyKY1gFrXHiIooNyNHQN6cygx3ToceY_IjadRPzYQU"
    url = "http://localhost:8000/api/strategies/tracking?execution_id=3"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        print(f"Requesting {url}...")
        resp = requests.get(url, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Got {len(data)} items")
            for item in data[:5]:
                print(f" - {item['symbol']} ({item['name']}): Rec {item['recommend_price']} -> Curr {item['current_price']} ({item['return_percent']}%)")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_tracking()
