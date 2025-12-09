import requests
import json

try:
    response = requests.get("http://localhost:8000/api/macro_data")
    data = response.json()
    print("Keys:", data.keys())
    if "deposit_volume" in data:
        print("Deposit Volume Length:", len(data["deposit_volume"]))
        if len(data["deposit_volume"]) > 0:
            print("Sample Deposit:", data["deposit_volume"][0])
            
    if "deposit_rates" in data:
        print("Deposit Rates Length:", len(data["deposit_rates"]))
        print("Sample Rate:", data["deposit_rates"][0])
        
except Exception as e:
    print(f"Error: {e}")
