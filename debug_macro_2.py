import akshare as ak
import pandas as pd

def test_fx_deposit():
    print("Testing FX...")
    try:
        # Try alternative FX source
        df = ak.currency_boc_sina(symbol="美元", start_date="20250101", end_date="20251231")
        print(f"FX Sina shape: {df.shape}")
        print(df.head())
    except Exception as e:
        print(f"FX Sina failed: {e}")

    print("\nTesting Deposit...")
    try:
        df = ak.macro_rmb_deposit()
        print(f"Deposit shape: {df.shape}")
        print(df.tail())
    except Exception as e:
        print(f"Deposit failed: {e}")

if __name__ == "__main__":
    test_fx_deposit()
