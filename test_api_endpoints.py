import requests
import json

def test_api():
    print("Testing Stock API (600036)...")
    try:
        res = requests.get("http://localhost:8000/api/stock/600036")
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print(json.dumps(res.json(), indent=2, ensure_ascii=False)[:500] + "...")
        else:
            print(res.text)
    except Exception as e:
        print(f"Stock API failed: {e}")

    print("\nTesting Macro API...")
    try:
        res = requests.get("http://localhost:8000/api/macro")
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            # Print summary of keys and list lengths
            summary = {k: len(v) if isinstance(v, list) else str(v)[:50] for k, v in data.items()}
            print(json.dumps(summary, indent=2, ensure_ascii=False))
        else:
            print(res.text)
    except Exception as e:
        print(f"Macro API failed: {e}")

if __name__ == "__main__":
    test_api()
