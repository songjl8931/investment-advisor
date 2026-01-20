import requests

def fetch_realtime_prices_batch(symbols):
    if not symbols:
        return {}
    
    # Prepare symbols for Sina
    sina_symbols = []
    symbol_map = {} # sina_code -> original_code
    
    for s in symbols:
        # Simple prefix logic
        prefix = "sh" if s.startswith(('6', '5')) else "sz"
        if s.startswith(('8', '4', '9')): 
             prefix = "bj" 
        
        code = f"{prefix}{s}"
        sina_symbols.append(code)
        symbol_map[code] = s
        
    price_map = {}
    
    # Batch in chunks of 80
    chunk_size = 80
    for i in range(0, len(sina_symbols), chunk_size):
        chunk = sina_symbols[i:i+chunk_size]
        url = f"http://hq.sinajs.cn/list={','.join(chunk)}"
        try:
            print(f"DEBUG: Fetching tracking batch {i}: {url}", flush=True)
            headers = { "Referer": "http://finance.sina.com.cn" }
            resp = requests.get(url, headers=headers, timeout=5)
            print(f"DEBUG: Batch {i} status: {resp.status_code}", flush=True)
            
            if resp.status_code == 200:
                content = resp.content.decode('gbk', errors='ignore')
                print(f"DEBUG: Response content preview: {content[:200]}...", flush=True)
                lines = content.strip().split('\n')
                for line in lines:
                    if '="' in line:
                        parts = line.split('="')
                        lhs = parts[0]
                        rhs = parts[1].strip('";')
                        
                        code_with_prefix = lhs.split('hq_str_')[-1]
                        original_symbol = symbol_map.get(code_with_prefix)
                        
                        if original_symbol and len(rhs) > 5:
                            vals = rhs.split(',')
                            try:
                                current_price = float(vals[3])
                                # If price is 0 (e.g. suspended/auction), try pre-close (vals[2])
                                if current_price == 0:
                                     current_price = float(vals[2])
                                
                                if current_price > 0:
                                    price_map[original_symbol] = current_price
                                    print(f"DEBUG: Got price for {original_symbol}: {current_price}", flush=True)
                            except:
                                pass
                        else:
                             print(f"DEBUG: Empty or short response for {code_with_prefix}: {rhs}", flush=True)
            else:
                print(f"DEBUG: Request failed with status {resp.status_code}")
        except Exception as e:
            print(f"Batch fetch error: {e}", flush=True)
            
    return price_map

if __name__ == "__main__":
    test_symbols = ["600000", "000001", "300750", "688001"]
    print("Testing symbols:", test_symbols)
    prices = fetch_realtime_prices_batch(test_symbols)
    print("Result:", prices)
