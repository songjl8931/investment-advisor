import akshare as ak
import pandas as pd
import datetime
import traceback

def log(msg):
    print(f"[CHECK] {msg}")

def check_stock_price(symbol="600036"):
    log(f"--- Checking Stock Price Interface for {symbol} ---")
    
    # 1. Try Realtime Spot (Known to be flaky)
    try:
        log("1. Testing stock_zh_a_spot_em (Realtime)...")
        df = ak.stock_zh_a_spot_em()
        target = df[df['代码'] == symbol]
        if not target.empty:
            log(f"SUCCESS: Realtime data found: {target.iloc[0].to_dict()}")
        else:
            log("WARNING: Realtime data returned but symbol not found (might be expected if list is partial).")
    except Exception as e:
        log(f"FAILURE: Realtime spot failed: {e}")

    # 2. Try Daily History (Fallback)
    try:
        log("2. Testing stock_zh_a_hist (History Fallback)...")
        end_date = datetime.datetime.now().strftime("%Y%m%d")
        start_date = (datetime.datetime.now() - datetime.timedelta(days=10)).strftime("%Y%m%d")
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust="qfq")
        if not df.empty:
            last_row = df.iloc[-1]
            log(f"SUCCESS: History data found. Latest: {last_row['日期']} Close: {last_row['收盘']}")
        else:
            log("FAILURE: History data returned empty.")
    except Exception as e:
        log(f"FAILURE: History data failed: {e}")

def check_macro_data():
    log("--- Checking Macro Data Interfaces ---")

    # 1. CPI
    try:
        log("1. Testing CPI (macro_china_cpi)...")
        df = ak.macro_china_cpi()
        log(f"SUCCESS: CPI data shape: {df.shape}")
    except Exception as e:
        log(f"FAILURE: CPI failed: {e}")

    # 2. PPI
    try:
        log("2. Testing PPI (macro_china_ppi)...")
        df = ak.macro_china_ppi()
        log(f"SUCCESS: PPI data shape: {df.shape}")
    except Exception as e:
        log(f"FAILURE: PPI failed: {e}")
        
    # 3. GDP
    try:
        log("3. Testing GDP (macro_china_gdp)...")
        df = ak.macro_china_gdp()
        log(f"SUCCESS: GDP data shape: {df.shape}")
    except Exception as e:
        log(f"FAILURE: GDP failed: {e}")
    
    # 4. LPR
    try:
        log("4. Testing LPR (macro_china_lpr)...")
        df = ak.macro_china_lpr()
        log(f"SUCCESS: LPR data shape: {df.shape}")
    except Exception as e:
        log(f"FAILURE: LPR failed: {e}")

    # 5. Deposit Rate (Often tricky)
    try:
        log("5. Testing Deposit (macro_rmb_deposit)...")
        # Trying the one that worked in debug searches before, or finding alternative
        df = ak.macro_rmb_deposit() 
        log(f"SUCCESS: Deposit data shape: {df.shape}")
    except Exception as e:
        log(f"FAILURE: Deposit failed: {e}")

if __name__ == "__main__":
    print(f"Akshare Version: {ak.__version__}")
    check_stock_price()
    check_macro_data()
