@app.get("/api/stock_info/{symbol}")
def get_stock_info(symbol: str):
    try:
        import akshare as ak
        import pandas as pd
        import tushare as ts
        
        # Tushare Init
        ts.set_token('75b8d0b573634a0a14e351034c90aee85acf5370f1e865a6a56b7dce')
        pro = ts.pro_api()

        # Convert symbol to Tushare format
        ts_code = symbol
        if not symbol.endswith(('.SH', '.SZ', '.BJ')):
             if symbol.startswith('6'):
                 ts_code = f"{symbol}.SH"
             elif symbol.startswith(('0', '3')):
                 ts_code = f"{symbol}.SZ"
             elif symbol.startswith(('4', '8')):
                 ts_code = f"{symbol}.BJ"
        
        # 1. Basic Info via Tushare (Replace ak.stock_individual_info_em)
        # Fetch Company Profile
        company_df = pro.stock_company(ts_code=ts_code)
        # Fetch Basic Info (Industry, Name)
        basic_df = pro.stock_basic(ts_code=ts_code)
        
        info_dict = {}
        if not company_df.empty:
            info_dict.update(company_df.iloc[0].to_dict())
        if not basic_df.empty:
            info_dict.update(basic_df.iloc[0].to_dict())

        # 2. Realtime Indicators (PE, PB, Market Cap) from Akshare Spot
        # Since Tushare daily_basic requires points/permissions we might not have, 
        # we fallback to akshare spot for market data.
        
        pe_ttm = 0
        pb = 0
        total_mv = 0 # 亿
        float_mv = 0 # 亿
        
        try:
            # Get real-time spot data for PE/PB/MarketCap
            # Note: This fetches all stocks, might be slightly slow but reliable for real-time
            spot_df = ak.stock_zh_a_spot_em()
            # Filter by symbol
            stock_spot = spot_df[spot_df['代码'] == symbol]
            if not stock_spot.empty:
                row = stock_spot.iloc[0]
                pe_ttm = row.get('市盈率-动态', 0)
                pb = row.get('市净率', 0)
                total_mv = row.get('总市值', 0) / 100000000
                float_mv = row.get('流通市值', 0) / 100000000
        except Exception as e:
            print(f"Market data fetch failed: {e}")
            pass

        # Construct Description from Tushare data
        desc = ""
        if 'introduction' in info_dict:
             desc = info_dict['introduction']
        else:
             desc = f"上市公司: {info_dict.get('name', symbol)}，位于{info_dict.get('industry', '')}行业。"
             if 'setup_date' in info_dict:
                 desc += f" 成立日期: {info_dict['setup_date']}。"

        return {
            "symbol": symbol,
            "name": info_dict.get('name', symbol), # From stock_basic
            "industry": info_dict.get('industry', '未知'), # From stock_basic
            "pe_ttm": round(float(pe_ttm), 2) if pe_ttm else 0,
            "pb": round(float(pb), 2) if pb else 0,
            "total_market_cap": round(float(total_mv), 2),
            "float_market_cap": round(float(float_mv), 2),
            "revenue_growth": 0, 
            "profit_growth": 0,
            "description": desc,
            "chairman": info_dict.get('chairman', ''),
            "manager": info_dict.get('manager', ''),
            "secretary": info_dict.get('secretary', ''),
            "reg_capital": info_dict.get('reg_capital', 0),
            "setup_date": info_dict.get('setup_date', ''),
            "province": info_dict.get('province', '')
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
