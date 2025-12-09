@app.get("/api/stock_info/{symbol}")
def get_stock_info(symbol: str):
    try:
        import akshare as ak
        import pandas as pd
        
        # 1. Basic Info (Industry, Market Cap, etc.)
        info_df = ak.stock_individual_info_em(symbol=symbol)
        # info_df has columns: item, value
        info_dict = dict(zip(info_df['item'], info_df['value']))
        
        # 2. Realtime Indicators (PE, PB) - Fetching single stock spot is tricky, 
        # try to get from stock_zh_a_spot_em but filter? Too slow.
        # Alternative: use stock_a_indicator_lg(symbol=symbol) for PE/PB (historical, take last)
        # Or estimate from basic info if possible.
        # Let's try stock_a_indicator_lg which returns daily indicators
        
        pe_ttm = 0
        pb = 0
        try:
            # Get last row of indicators
            indicators = ak.stock_a_indicator_lg(symbol=symbol)
            if not indicators.empty:
                last_row = indicators.iloc[-1]
                pe_ttm = last_row.get('pe_ttm', 0)
                pb = last_row.get('pb', 0)
        except:
            pass # Fallback if fails

        # 3. Financials (Revenue/Profit Growth)
        # ak.stock_financial_abstract(symbol=symbol) ??
        # Let's use simple mock for growth if real data is too heavy, 
        # or try to fetch key financial indicators.
        
        return {
            "symbol": symbol,
            "name": info_dict.get('股票简称', symbol),
            "industry": info_dict.get('行业', '未知'),
            "pe_ttm": round(float(pe_ttm), 2) if pe_ttm else 0,
            "pb": round(float(pb), 2) if pb else 0,
            "total_market_cap": round(float(info_dict.get('总市值', 0)) / 100000000, 2), # 亿
            "float_market_cap": round(float(info_dict.get('流通市值', 0)) / 100000000, 2),
            "revenue_growth": 0, # Placeholder as retrieving this is slow
            "profit_growth": 0,
            "description": f"上市公司: {info_dict.get('股票简称', symbol)}，位于{info_dict.get('行业', '')}行业。上市日期: {info_dict.get('上市时间', '')}。"
        }
    except Exception as e:
        print(f"Stock info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock_tech/{symbol}")
def get_stock_tech(symbol: str):
    try:
        import akshare as ak
        import pandas as pd
        
        # Fetch daily history (last 100 days is enough for these indicators)
        # start_date = (datetime.now() - timedelta(days=200)).strftime("%Y%m%d")
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", adjust="qfq")
        if df.empty:
            raise ValueError("No data found")
            
        # Calculate Indicators
        close = df['收盘']
        
        # MA
        ma5 = close.rolling(window=5).mean().iloc[-1]
        ma20 = close.rolling(window=20).mean().iloc[-1]
        
        # MACD
        # EMA12
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        dif = ema12 - ema26
        dea = dif.ewm(span=9, adjust=False).mean()
        macd_hist = (dif - dea) * 2
        
        # BOLL
        # Mid = MA20, Upper = Mid + 2*std, Lower = Mid - 2*std
        boll_mid = close.rolling(window=20).mean()
        boll_std = close.rolling(window=20).std()
        boll_upper = boll_mid + 2 * boll_std
        boll_lower = boll_mid - 2 * boll_std
        
        # RSI (6)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=6).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=6).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # KDJ (9,3,3) - Simplified calculation
        low_min = df['最低'].rolling(window=9).min()
        high_max = df['最高'].rolling(window=9).max()
        rsv = (close - low_min) / (high_max - low_min) * 100
        k = rsv.ewm(com=2).mean()
        d = k.ewm(com=2).mean()
        j = 3 * k - 2 * d

        return {
            "ma5": round(ma5, 2),
            "ma20": round(ma20, 2),
            "macd": {
                "dif": round(dif.iloc[-1], 3),
                "dea": round(dea.iloc[-1], 3),
                "hist": round(macd_hist.iloc[-1], 3)
            },
            "kdj": {
                "k": round(k.iloc[-1], 2),
                "d": round(d.iloc[-1], 2),
                "j": round(j.iloc[-1], 2)
            },
            "rsi": round(rsi.iloc[-1], 2),
            "boll": {
                "upper": round(boll_upper.iloc[-1], 2),
                "mid": round(boll_mid.iloc[-1], 2),
                "lower": round(boll_lower.iloc[-1], 2)
            }
        }
    except Exception as e:
        print(f"Stock tech error: {e}")
        # Return mock/safe data if calculation fails (e.g. new stock)
        return {
            "ma5": 0, "ma20": 0,
            "macd": {"dif": 0, "dea": 0, "hist": 0},
            "kdj": {"k": 0, "d": 0, "j": 0},
            "rsi": 0,
            "boll": {"upper": 0, "mid": 0, "lower": 0}
        }
