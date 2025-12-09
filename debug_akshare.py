import akshare as ak
import json
import datetime

def test_stock_info(symbol):
    print(f"\nTesting stock info for {symbol}...")
    try:
        # 1. EastMoney
        print("  Fetching EM info...")
        df = ak.stock_individual_info_em(symbol=symbol)
        print(f"  EM info result shape: {df.shape}")
        print(df.head())
    except Exception as e:
        print(f"  EM info failed: {e}")

    try:
        # 2. CNINFO
        print("  Fetching CNINFO profile...")
        df_profile = ak.stock_profile_cninfo(symbol=symbol)
        print(f"  CNINFO result shape: {df_profile.shape}")
        if not df_profile.empty:
            print(df_profile.iloc[0].to_dict())
    except Exception as e:
        print(f"  CNINFO failed: {e}")

    try:
        # 3. Financial Abstract
        print("  Fetching Financial Abstract...")
        df_fin = ak.stock_financial_abstract(symbol=symbol)
        print(f"  Financial result shape: {df_fin.shape}")
        if not df_fin.empty:
            print(df_fin.head())
    except Exception as e:
        print(f"  Financial failed: {e}")

def test_macro_data():
    print("\nTesting macro data...")
    try:
        print("  Fetching CPI...")
        cpi_df = ak.macro_china_cpi_monthly()
        print(f"  CPI shape: {cpi_df.shape}")
        print(cpi_df.tail())
    except Exception as e:
        print(f"  CPI failed: {e}")

    try:
        print("  Fetching PPI...")
        ppi_df = ak.macro_china_ppi_yearly()
        print(f"  PPI shape: {ppi_df.shape}")
        print(ppi_df.tail())
    except Exception as e:
        print(f"  PPI failed: {e}")
        
    try:
        print("  Fetching LPR...")
        lpr_df = ak.macro_china_lpr()
        print(f"  LPR shape: {lpr_df.shape}")
        print(lpr_df.tail())
    except Exception as e:
        print(f"  LPR failed: {e}")
        
    try:
        print("  Fetching FX...")
        fx_df = ak.currency_boc_safe()
        print(f"  FX shape: {fx_df.shape}")
        print(fx_df.tail())
    except Exception as e:
        print(f"  FX failed: {e}")

    try:
        print("  Fetching Deposit Volume...")
        dep_df = ak.macro_rmb_deposit()
        print(f"  Deposit shape: {dep_df.shape}")
        print(dep_df.tail())
    except Exception as e:
        print(f"  Deposit failed: {e}")

if __name__ == "__main__":
    test_stock_info("600036") # CM Bank
    test_macro_data()
