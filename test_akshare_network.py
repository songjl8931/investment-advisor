import akshare as ak
import os
import sys
import requests

def test_endpoints():
    print("--- Testing Akshare Endpoints ---")
    
    # Test 1: Info
    print("\n1. Testing stock_individual_info_em (Info)...")
    try:
        df = ak.stock_individual_info_em(symbol="600036")
        print("Success Info")
    except Exception as e:
        print(f"Failed Info: {e}")

    # Test 2: History
    print("\n2. Testing stock_zh_a_hist (History)...")
    try:
        df = ak.stock_zh_a_hist(symbol="600036", period="daily", start_date="20251201", end_date="20251209")
        print(f"Success History: {len(df)} rows")
    except Exception as e:
        print(f"Failed History: {e}")

    # Test 3: Spot
    print("\n3. Testing stock_zh_a_spot_em (Spot)...")
    try:
        df = ak.stock_zh_a_spot_em()
        print(f"Success Spot: {len(df)} rows")
    except Exception as e:
        print(f"Failed Spot: {e}")

if __name__ == "__main__":
    print(">>> CHECKING ENV VARS")
    print(f"HTTP_PROXY: {os.environ.get('HTTP_PROXY')}")
    print(f"HTTPS_PROXY: {os.environ.get('HTTPS_PROXY')}")
    
    print("\n>>> RUN 1: Default Environment")
    # Test with qfq to match server
    print("\n2b. Testing stock_zh_a_hist (History) with adjust='qfq'...")
    try:
        df = ak.stock_zh_a_hist(symbol="600036", period="daily", start_date="20251201", end_date="20251209", adjust="qfq")
        print(f"Success History (qfq): {len(df)} rows")
    except Exception as e:
        print(f"Failed History (qfq): {e}")

    test_endpoints()
    
    print("\n>>> RUN 2: Cleared Proxy Environment")
    os.environ['NO_PROXY'] = '*'
    if 'HTTP_PROXY' in os.environ: del os.environ['HTTP_PROXY']
    if 'HTTPS_PROXY' in os.environ: del os.environ['HTTPS_PROXY']
    
    # Re-import requests/akshare might be needed if they cached env vars? 
    # Usually requests checks env on each request, but let's see.
    test_endpoints()
