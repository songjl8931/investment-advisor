import akshare as ak
import pandas as pd

def log(msg):
    print(f"[DEBUG] {msg}")

def test_spot_data(symbol="600036"):
    log("Testing stock_zh_a_spot_em (Realtime Spot Data)...")
    try:
        # This returns all stocks, so it might be slow, but it's reliable for PE/PB/MarketCap
        df = ak.stock_zh_a_spot_em()
        # Filter for our symbol
        target = df[df['代码'] == symbol]
        if not target.empty:
            log("Found symbol in spot data!")
            print(target.iloc[0].to_dict())
        else:
            log("Symbol not found in spot data.")
    except Exception as e:
        log(f"Spot data failed: {e}")

def test_macro_alternatives():
    log("Testing Macro Alternatives...")
    
    # CPI
    try:
        log("Testing macro_china_cpi (General)...")
        df = ak.macro_china_cpi()
        print(df.tail())
    except Exception as e:
        log(f"macro_china_cpi failed: {e}")

    # Money Supply (M2) often correlates with deposits or is a good proxy if deposits fail
    try:
        log("Testing macro_china_money_supply...")
        df = ak.macro_china_money_supply()
        print(df.tail())
    except Exception as e:
        log(f"macro_china_money_supply failed: {e}")

if __name__ == "__main__":
    test_spot_data()
    test_macro_alternatives()
