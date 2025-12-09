import akshare as ak
import pandas as pd

print("--- Testing Deposit Rate ---")
try:
    # Trying to find a function for deposit rates. 
    # Common candidates: macro_china_deposit_rate, macro_china_benchmark_deposit_rate
    
    # Let's try macro_china_deposit_rate first if it exists
    if hasattr(ak, 'macro_china_deposit_rate'):
        df = ak.macro_china_deposit_rate()
        print("Found macro_china_deposit_rate")
        print(df.head())
        print(df.columns)
    else:
        print("macro_china_deposit_rate not found. Checking other options...")
        # List all macro attributes to find relevant one
        for attr in dir(ak):
            if 'macro' in attr and 'deposit' in attr:
                print(f"Found candidate: {attr}")

except Exception as e:
    print(f"Error: {e}")
