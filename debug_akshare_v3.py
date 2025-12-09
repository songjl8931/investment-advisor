import akshare as ak
import pandas as pd

def test_xq_v2():
    print("--- Testing Xueqiu V2 ---")
    symbol = "SH600036"
    
    # Try basic info
    try:
        print(f"Testing stock_individual_basic_info_xq({symbol})...")
        # Note: This function might not take symbol, or takes it differently
        # Let's check documentation or source if possible, but trial is faster
        # Actually usually it takes 'symbol'
        # But let's try to list functions parameters? No, just try.
        pass
    except Exception as e:
        print(f"basic info failed: {e}")

    # Try spot again with strict error printing
    try:
        print(f"Testing stock_individual_spot_xq({symbol})...")
        df = ak.stock_individual_spot_xq(symbol=symbol)
        print(df)
    except Exception as e:
        print(f"spot failed: {e}")

def test_macro_fx():
    print("--- Testing FX Reserves ---")
    try:
        df = ak.macro_china_fx_reserves_yearly()
        print(df.tail())
    except Exception as e:
        print(f"FX yearly failed: {e}")

if __name__ == "__main__":
    test_xq_v2()
    test_macro_fx()
