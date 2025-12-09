import akshare as ak
import pandas as pd

print("--- Testing macro_bank_china_interest_rate ---")
try:
    df = ak.macro_bank_china_interest_rate()
    print("Columns:", df.columns)
    print("Head:", df.head())
    print("Tail:", df.tail())
except Exception as e:
    print(f"Error: {e}")
