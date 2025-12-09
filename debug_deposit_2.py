import akshare as ak
import pandas as pd

print("--- Testing macro_rmb_deposit ---")
try:
    df = ak.macro_rmb_deposit()
    print("Columns:", df.columns)
    print("Head:", df.head())
    print("Tail:", df.tail())
except Exception as e:
    print(f"Error: {e}")
