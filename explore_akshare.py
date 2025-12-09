import akshare as ak
import pandas as pd

def log(msg):
    print(f"[DEBUG] {msg}")

def search_akshare_funcs(keyword):
    log(f"Searching for '{keyword}' in akshare...")
    funcs = [f for f in dir(ak) if keyword in f]
    for f in funcs:
        print(f"  - {f}")
    return funcs

def test_xueqiu_stock(symbol="SH600036"):
    log(f"Testing Xueqiu stock info for {symbol}...")
    # Guessing function names based on common patterns
    # Usually stock_individual_spot_xq or similar
    try:
        # Try to find xq related functions first
        pass
    except Exception as e:
        log(f"Error: {e}")

def test_macro_indicators():
    log("Testing Macro Indicators...")
    
    # GDP
    try:
        log("Testing GDP...")
        # macro_china_gdp_yearly?
        df = ak.macro_china_gdp()
        print(f"GDP: {df.tail(2)}")
    except Exception as e:
        log(f"GDP failed: {e}")

    # PMI
    try:
        log("Testing PMI...")
        df = ak.macro_china_pmi()
        print(f"PMI: {df.tail(2)}")
    except Exception as e:
        log(f"PMI failed: {e}")

    # Foreign Reserves
    try:
        log("Testing Foreign Reserves...")
        df = ak.macro_china_fx_reserves()
        print(f"FX Reserves: {df.tail(2)}")
    except Exception as e:
        log(f"FX Reserves failed: {e}")

if __name__ == "__main__":
    search_akshare_funcs("xq")
    search_akshare_funcs("gdp")
    search_akshare_funcs("pmi")
    search_akshare_funcs("reserve")
    
    test_macro_indicators()
    
    # Try specific xueqiu function if found
    try:
        print("\nTesting stock_individual_spot_xq (if exists)...")
        # Note: Xueqiu usually needs SH/SZ prefix
        # Checking if stock_individual_spot_xq exists
        if hasattr(ak, 'stock_individual_spot_xq'):
            df = ak.stock_individual_spot_xq(symbol="SH600036")
            print(df)
    except Exception as e:
        print(f"stock_individual_spot_xq failed: {e}")
