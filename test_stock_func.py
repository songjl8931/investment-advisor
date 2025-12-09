import sys
import os

# Copying the proxy cleanup from server.py
os.environ['NO_PROXY'] = '*'
if 'HTTP_PROXY' in os.environ:
    del os.environ['HTTP_PROXY']
if 'HTTPS_PROXY' in os.environ:
    del os.environ['HTTPS_PROXY']
if 'http_proxy' in os.environ:
    del os.environ['http_proxy']
if 'https_proxy' in os.environ:
    del os.environ['https_proxy']

# REMOVED IMPORTS for testing
# from fastapi import FastAPI
# import uvicorn
import time
import datetime
import akshare as ak
import requests

def get_stock(symbol: str):
    print(f"DEBUG: Fetching stock {symbol}")
    try:
        # Fetch last 5 days
        end_date = datetime.datetime.now().strftime("%Y%m%d")
        start_date = (datetime.datetime.now() - datetime.timedelta(days=10)).strftime("%Y%m%d")
        print(f"DEBUG: calling ak.stock_zh_a_hist for {symbol} from {start_date} to {end_date}")
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust="qfq")
        
        if not df.empty:
            print(f"DEBUG: Data found, shape {df.shape}")
            last_row = df.iloc[-1]
            price = float(last_row['收盘'])
            print(f"SUCCESS: Price {price}")
            return price
        else:
            print("FAILURE: Empty df")
            return None
    except Exception as e:
        print(f"FAILURE: Exception {e}")
        return None

if __name__ == "__main__":
    print("Testing with proxy cleanup but NO imports...")
    get_stock("600036")
