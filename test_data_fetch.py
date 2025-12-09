import requests
import json

def test_local_api():
    print("--- Testing Local API ---")
    
    # News
    print("\n1. Testing /api/news...")
    try:
        resp = requests.get("http://localhost:8000/api/news", timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Got {len(data)} news items.")
            if data:
                print(f"First item: {data[0]['title']} ({data[0]['timestamp']})")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"News API Failed: {e}")

    # Macro
    print("\n2. Testing /api/macro...")
    try:
        resp = requests.get("http://localhost:8000/api/macro", timeout=30) # Macro might be slow
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Keys:", data.keys())
            if data['cpi']:
                print(f"CPI Sample: {data['cpi'][-1]}")
            if data['lpr']:
                print(f"LPR Sample: {data['lpr'][-1]}")
            if data['deposit_volume']:
                print(f"Deposit Sample: {data['deposit_volume'][-1]}")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"Macro API Failed: {e}")

if __name__ == "__main__":
    test_local_api()
