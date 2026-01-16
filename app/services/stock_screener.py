import akshare as ak
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from concurrent.futures import ThreadPoolExecutor, as_completed

def check_stock_details(row, params):
    """
    Worker function to check details for a single stock.
    Returns result dict if valid, None otherwise.
    """
    try:
        symbol = str(row['代码'])
        name = str(row['名称'])
        current_price = float(row['最新价'])
        hit_reasons = [
            f"涨幅: {row['涨跌幅']}%",
            f"量比: {row['量比']}",
            f"换手: {row['换手率']}%"
        ]
        
        is_valid = True
        
        # 1. MA Alignment (均线多头)
        if params.get('check_ma_alignment'):
            try:
                # Fetch daily history
                hist = ak.stock_zh_a_hist(symbol=symbol, period="daily", adjust="qfq")
                if len(hist) > 20:
                    close = hist['收盘']
                    ma5 = close.rolling(window=5).mean().iloc[-1]
                    ma10 = close.rolling(window=10).mean().iloc[-1]
                    ma20 = close.rolling(window=20).mean().iloc[-1]
                    
                    # Check alignment: MA5 > MA10 > MA20
                    if not (current_price > ma5 and ma5 > ma10 and ma10 > ma20):
                        is_valid = False
                    else:
                        hit_reasons.append("均线多头排列")
                else:
                    is_valid = False
            except:
                is_valid = False
        
        if not is_valid: return None

        # 2. Volume Pattern (温和放量)
        if params.get('check_volume_up'):
            try:
                # Fetch history if not already fetched (optimization needed ideally)
                # For simplicity in threaded worker, we might fetch again or pass it. 
                # Since akshare calls are the bottleneck, let's fetch if needed.
                # Ideally check_ma_alignment and this should share data.
                # For now, let's assume we fetch again or reuse if we restructured.
                # To avoid complex passing, we just fetch. Akshare might cache internally? No.
                # Let's just fetch once at start of this function if any historical check is needed.
                
                # Refactoring: Fetch history once if needed by any check
                if 'hist' not in locals() and (params.get('check_ma_alignment') or params.get('check_volume_up')):
                     hist = ak.stock_zh_a_hist(symbol=symbol, period="daily", adjust="qfq")

                if len(hist) >= 5:
                    vols = hist['成交量'].tail(5).values
                    recent_avg = np.mean(vols[-3:])
                    prev_avg = np.mean(vols[-5:-3])
                    if recent_avg < prev_avg * 1.1: 
                            is_valid = False
                    else:
                            hit_reasons.append("成交量温和放大")
            except:
                pass # If fetch fails or calc fails, ignore or set invalid? Let's ignore for loose check

        if not is_valid: return None
        
        # 3. Intraday Trend
        if params.get('check_strong_trend') or params.get('check_new_high_pullback'):
            try:
                turnover_amt = float(row['成交额'])
                volume = float(row['成交量']) * 100
                if volume > 0:
                    avg_price = turnover_amt / volume
                    if params.get('check_strong_trend'):
                        if current_price < avg_price:
                            is_valid = False
                        else:
                            hit_reasons.append("站稳均价线")
                    
                    if is_valid and params.get('check_new_high_pullback'):
                        high = float(row['最高'])
                        if current_price >= high * 0.98 and current_price > avg_price:
                            hit_reasons.append("接近日内新高且支撑有效")
                        else:
                            is_valid = False
            except:
                pass

        if is_valid:
            return {
                "symbol": symbol,
                "name": name,
                "price": current_price,
                "change_percent": float(row['涨跌幅']),
                "volume_ratio": float(row['量比']) if pd.notnull(row['量比']) else 0,
                "turnover_rate": float(row['换手率']) if pd.notnull(row['换手率']) else 0,
                "reason": {
                    "hit_criteria": hit_reasons
                }
            }
        return None
    except Exception as e:
        print(f"Error checking {row['代码']}: {e}")
        return None

def execute_strategy(params: dict):
    """
    Execute stock screening strategy based on params.
    Includes advanced filtering for K-line, volume, and intraday trends.
    """
    try:
        # 1. Fetch Spot Data (All A-Shares)
        df = ak.stock_zh_a_spot_em()
        
        # 2. Basic Filtering (Pre-filter to reduce API calls for detailed data)
        filtered_df = df.copy()
        
        # Exclude ST, *ST
        filtered_df = filtered_df[~filtered_df['名称'].str.contains('ST')]
        filtered_df = filtered_df[~filtered_df['名称'].str.contains('退')]
        
        # Change %
        if 'min_change' in params:
            filtered_df = filtered_df[filtered_df['涨跌幅'] >= float(params['min_change'])]
        if 'max_change' in params:
            filtered_df = filtered_df[filtered_df['涨跌幅'] <= float(params['max_change'])]
            
        # Turnover
        if 'min_turnover' in params:
            filtered_df = filtered_df[filtered_df['换手率'] >= float(params['min_turnover'])]
        if 'max_turnover' in params:
            filtered_df = filtered_df[filtered_df['换手率'] <= float(params['max_turnover'])]
            
        # Volume Ratio (量比)
        if 'min_volume_ratio' in params:
            filtered_df['量比'] = pd.to_numeric(filtered_df['量比'], errors='coerce')
            filtered_df = filtered_df[filtered_df['量比'] >= float(params['min_volume_ratio'])]
            
        # Market Cap (流通市值)
        if 'min_market_cap' in params:
            filtered_df = filtered_df[filtered_df['流通市值'] >= float(params['min_market_cap']) * 100000000]
        if 'max_market_cap' in params:
            filtered_df = filtered_df[filtered_df['流通市值'] <= float(params['max_market_cap']) * 100000000]

        # Limit candidates for detailed check to avoid API rate limits/timeout
        # Increase candidate pool slightly but process in parallel
        candidates = filtered_df.sort_values(by='涨跌幅', ascending=False).head(30)
        
        final_results = []
        
        # Use ThreadPoolExecutor for concurrent fetching
        # Max workers 5-10 to be polite to the data source and avoid blocking
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_stock = {executor.submit(check_stock_details, row, params): row for _, row in candidates.iterrows()}
            
            for future in as_completed(future_to_stock):
                res = future.result()
                if res:
                    final_results.append(res)
                    if len(final_results) >= 10:
                        # Note: This break only stops collecting, but other threads might still be running.
                        # We can't easily cancel them, but we can stop submitting if we weren't submitting all at once.
                        # Given we submitted all 30, we just wait or break loop. 
                        # Since we want top results, maybe we should wait for all 30 and take top 10?
                        # The original logic was "find first 10". Let's stick to that but we can't easily kill threads.
                        # Actually, better to collect all valid from top 30 and return top 10.
                        pass

        # Sort by change percent again to be sure
        final_results.sort(key=lambda x: x['change_percent'], reverse=True)
        return final_results[:10]
        
    except Exception as e:
        print(f"Strategy Execution Error: {e}")
        return []
        
    except Exception as e:
        print(f"Strategy Execution Error: {e}")
        return []
