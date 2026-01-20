import requests
import json

def test_stock_info():
    symbol = "600519"
    url = f"http://localhost:8000/api/stock_info/{symbol}"
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            data = resp.json()
            print("Successfully fetched stock info:")
            # Print specific new fields to verify
            print(f"Name: {data.get('name')}")
            print(f"Chairman: {data.get('chairman')}")
            print(f"Manager: {data.get('manager')}")
            print(f"Website: {data.get('website')}")
            print(f"Main Business: {data.get('main_business')}")
            print("-" * 20)
            print(json.dumps(data, indent=2, ensure_ascii=False)[:500] + "...")
        else:
            print(f"Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_stock_info()
