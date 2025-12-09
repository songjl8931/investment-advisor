import akshare as ak
import pandas as pd

def test_spot_main():
    print("Testing stock_zh_a_spot (Sina Source)...")
    try:
        # This uses Sina source, which might be more stable than EM
        df = ak.stock_zh_a_spot()
        print(f"Success. Shape: {df.shape}")
        target = df[df['code'] == 'sh600036'] # Sina uses prefixes usually? Or akshare handles it?
        if target.empty:
             target = df[df['code'] == '600036']
        print(target)
    except Exception as e:
        print(f"Sina spot failed: {e}")

if __name__ == "__main__":
    test_spot_main()
