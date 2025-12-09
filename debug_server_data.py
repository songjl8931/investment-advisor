import akshare as ak
import pandas as pd
import datetime
import traceback

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_stock_info(symbol="600036"):
    log(f"--- Testing Stock Info for {symbol} ---")
    
    # 1. EM Info
    try:
        log("Fetching ak.stock_individual_info_em...")
        df = ak.stock_individual_info_em(symbol=symbol)
        log(f"Success. Columns: {df.columns.tolist()}")
        print(df.head(3))
    except Exception:
        log(f"Failed ak.stock_individual_info_em: {traceback.format_exc()}")

    # 2. CNINFO Profile
    try:
        log("Fetching ak.stock_profile_cninfo...")
        df = ak.stock_profile_cninfo(symbol=symbol)
        log(f"Success. Columns: {df.columns.tolist()}")
        if not df.empty:
            print(df.iloc[0].to_dict())
    except Exception:
        log(f"Failed ak.stock_profile_cninfo: {traceback.format_exc()}")

    # 3. Financial Abstract
    try:
        log("Fetching ak.stock_financial_abstract...")
        df = ak.stock_financial_abstract(symbol=symbol)
        log(f"Success. Columns: {df.columns.tolist()}")
        print(df.head(3))
    except Exception:
        log(f"Failed ak.stock_financial_abstract: {traceback.format_exc()}")

def test_macro_data():
    log("--- Testing Macro Data ---")

    # 1. CPI
    try:
        log("Fetching CPI (macro_china_cpi_monthly)...")
        df = ak.macro_china_cpi_monthly()
        log(f"Success. Columns: {df.columns.tolist()}")
        print(df.tail(3))
    except Exception:
        log(f"Failed macro_china_cpi_monthly: {traceback.format_exc()}")
        try:
            log("Trying fallback macro_china_cpi...")
            df = ak.macro_china_cpi()
            log(f"Success Fallback. Columns: {df.columns.tolist()}")
            print(df.tail(3))
        except Exception:
            log(f"Failed fallback macro_china_cpi: {traceback.format_exc()}")

    # 2. PPI
    try:
        log("Fetching PPI (macro_china_ppi_yearly)...")
        df = ak.macro_china_ppi_yearly()
        log(f"Success. Columns: {df.columns.tolist()}")
        print(df.tail(3))
    except Exception:
        log(f"Failed macro_china_ppi_yearly: {traceback.format_exc()}")

    # 3. Deposit
    try:
        log("Fetching Deposit (macro_rmb_deposit)...")
        df = ak.macro_rmb_deposit()
        log(f"Success. Columns: {df.columns.tolist()}")
        print(df.tail(3))
    except Exception:
        log(f"Failed macro_rmb_deposit: {traceback.format_exc()}")

if __name__ == "__main__":
    print(f"AKShare Version: {ak.__version__}")
    test_stock_info()
    test_macro_data()
