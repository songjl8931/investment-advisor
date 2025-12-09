import akshare as ak
import pandas as pd
import time

def log(msg):
    print(f"[TEST] {msg}")

def test_individual_info():
    symbol = "600036"
    log(f"Testing stock_individual_info_em for {symbol}...")
    try:
        df = ak.stock_individual_info_em(symbol=symbol)
        log(f"Success. Shape: {df.shape}")
        print(df.head(3))
    except Exception as e:
        log(f"Failed: {e}")

def test_hist_data():
    symbol = "600036"
    log(f"Testing stock_zh_a_hist for {symbol} (Daily)...")
    try:
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date="20240101", end_date="20240110", adjust="qfq")
        log(f"Success. Shape: {df.shape}")
        print(df.head(3))
    except Exception as e:
        log(f"Failed: {e}")

def test_realtime_spot():
    log("Testing stock_zh_a_spot_em (All Stocks Realtime)...")
    try:
        df = ak.stock_zh_a_spot_em()
        log(f"Success EM. Shape: {df.shape}")
        print(df.head(3))
    except Exception as e:
        log(f"Failed EM: {e}")

    log("Testing stock_zh_a_spot (Sina)...")
    try:
        # Note: stock_zh_a_spot might be deprecated or different in recent versions
        # Checking documentation or trying it.
        if hasattr(ak, 'stock_zh_a_spot'):
            df = ak.stock_zh_a_spot()
            log(f"Success Sina. Shape: {df.shape}")
            print(df.head(3))
        else:
            log("stock_zh_a_spot function not found in akshare.")
    except Exception as e:
        log(f"Failed Sina: {e}")

    log("Testing stock_individual_spot_xq (Xueqiu)...")
    try:
        # Xueqiu usually needs SH/SZ prefix
        symbol_xq = "SH600036"
        if hasattr(ak, 'stock_individual_spot_xq'):
            df = ak.stock_individual_spot_xq(symbol=symbol_xq)
            log(f"Success Xueqiu. Shape: {df.shape}")
            print(df)
        else:
            log("stock_individual_spot_xq function not found.")
    except Exception as e:
        log(f"Failed Xueqiu: {e}")

if __name__ == "__main__":
    print(f"Akshare Version: {ak.__version__}")
    test_individual_info()
    print("-" * 20)
    test_hist_data()
    print("-" * 20)
    test_realtime_spot()
