import os
import sys

# REMOVED proxy cleanup code as it breaks akshare connection
# os.environ['NO_PROXY'] = '*'
# if 'HTTP_PROXY' in os.environ:
#     del os.environ['HTTP_PROXY']
# if 'HTTPS_PROXY' in os.environ:
#     del os.environ['HTTPS_PROXY']
# if 'http_proxy' in os.environ:
#     del os.environ['http_proxy']
# if 'https_proxy' in os.environ:
#     del os.environ['https_proxy']

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import time
import json
import requests
import base64
from typing import List, Optional, Dict, Any
import akshare as ak
import pandas as pd
import tushare as ts
import datetime
from app.routers import auth, strategies

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    print("DEBUG: Server starting...", flush=True)
    print(f"DEBUG: Proxy Env Vars: HTTP_PROXY={os.environ.get('HTTP_PROXY')}, HTTPS_PROXY={os.environ.get('HTTPS_PROXY')}", flush=True)
    try:
        # Test basic connectivity
        import requests
        print("DEBUG: Testing baidu connection...", flush=True)
        resp = requests.get("https://www.baidu.com", timeout=5)
        print(f"DEBUG: Connectivity check status: {resp.status_code}", flush=True)
    except Exception as e:
        print(f"DEBUG: Connectivity check failed: {e}", flush=True)


app.include_router(auth.router)
app.include_router(strategies.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Cache ---
CACHE_FILE = "stock_cache.json"
def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(data):
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
    except:
        pass

stock_cache = load_cache()

# --- Models ---
MODELS_FILE = "user_models.json"

class ModelConfig(BaseModel):
    id: str
    provider: str
    name: str
    api_key: str
    base_url: str
    modules: List[str]
    is_active: bool

def get_active_model_for_module(module: str):
    if os.path.exists(MODELS_FILE):
        try:
            with open(MODELS_FILE, 'r', encoding='utf-8') as f:
                models = json.load(f)
                for m in models:
                    if m.get('is_active') and module in m.get('modules', []):
                        return m
        except:
            pass
    return None

@app.get("/api/models")
def get_models():
    if os.path.exists(MODELS_FILE):
        try:
            with open(MODELS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

@app.post("/api/models")
def save_models(models: List[ModelConfig]):
    data = [m.dict() for m in models]
    with open(MODELS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return {"status": "success"}

# --- Chat ---
class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    model: str = "deepseek-chat"
    temperature: float = 1.0

@app.post("/api/chat")
def chat_proxy(req: ChatRequest):
    model_config = get_active_model_for_module("ai_report")
    if not model_config:
        raise HTTPException(status_code=500, detail="No model configured for AI Report")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {model_config['api_key']}"
    }
    payload = {
        "model": model_config['name'],
        "messages": req.messages,
        "temperature": req.temperature
    }
    try:
        print(f"Proxying to {model_config['provider']}...")
        # Increase timeout to 180s for long generations
        resp = requests.post(model_config['base_url'], headers=headers, json=payload, timeout=180)
        if resp.status_code != 200:
            print(f"API Error: {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Assets ---
ASSETS_FILE = "user_assets.json"
class Asset(BaseModel):
    id: str
    symbol: str
    name: str
    type: str
    quantity: float
    costPrice: float
    currentPrice: float
    currency: str

@app.get("/api/assets")
def get_assets():
    if os.path.exists(ASSETS_FILE):
        try:
            with open(ASSETS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

@app.post("/api/assets")
def save_assets(assets: List[Asset]):
    data = [a.dict() for a in assets]
    with open(ASSETS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return {"status": "success"}

# --- Recognize Assets (NEW) ---
@app.post("/api/recognize_assets")
async def recognize_assets(file: UploadFile = File(...)):
    model_config = get_active_model_for_module("position_entry")
    if not model_config:
        raise HTTPException(status_code=500, detail="No model configured for Position Entry.")

    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    mime_type = file.content_type or "image/jpeg"
    
    prompt = """
    请识别这张图片中的持仓信息，并提取为JSON格式。
    请尽可能识别所有可见的持仓记录。
    返回一个JSON列表，每个元素包含以下字段：
    - symbol: 股票代码 (如 600519, 00700, AAPL)。如果是A股，尽量保留6位数字代码。
    - name: 股票名称
    - quantity: 持股数量 (提取纯数字)
    - costPrice: 成本价 (提取纯数字)
    - currency: 币种 (根据符号判断，CNY/USD/HKD，默认为CNY)
    
    只返回标准的JSON数组字符串，不要包含Markdown代码块标记(如```json)。
    如果无法识别任何数据，返回空数组 []。
    """
    
    payload = {
        "model": model_config['name'],
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {model_config['api_key']}"
    }
    
    try:
        print(f"Sending image to {model_config['provider']} ({model_config['name']})...")
        response = requests.post(model_config['base_url'], headers=headers, json=payload, timeout=120)
        
        if response.status_code != 200:
             print(f"Recognition API Error: {response.text}")
             raise HTTPException(status_code=response.status_code, detail=f"API Error: {response.text}")
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        print(f"Recognition result: {content[:100]}...")
        
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"Recognition failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Reports ---
REPORTS_FILE = "user_reports.json"
@app.get("/api/reports")
def get_reports():
    if os.path.exists(REPORTS_FILE):
        try:
            with open(REPORTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

@app.post("/api/reports")
def save_reports(reports: List[Dict[str, Any]]):
    with open(REPORTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)
    return {"status": "success"}

# --- Goals ---
GOALS_FILE = "user_goals.json"
@app.get("/api/goals")
def get_goals():
    if os.path.exists(GOALS_FILE):
        try:
            with open(GOALS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

@app.post("/api/goals")
def save_goals(goals: Dict[str, Any]):
    with open(GOALS_FILE, 'w', encoding='utf-8') as f:
        json.dump(goals, f, indent=2, ensure_ascii=False)
    return {"status": "success"}

# --- News ---
@app.get("/api/news")
def get_news(limit: int = 20):
    print(f"DEBUG: Fetching news (limit={limit})...", flush=True)
    news_data = []
    try:
        # Use Sina Finance Rolling News
        # http://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&k=&num=20&page=1
        url = "http://feed.mix.sina.com.cn/api/roll/get"
        params = {
            "pageid": "153",
            "lid": "2509",
            "k": "",
            "num": str(limit),
            "page": "1"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "Referer": "http://finance.sina.com.cn/"
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        if resp.status_code == 200:
            data_json = resp.json()
            if data_json and 'result' in data_json and 'data' in data_json['result']:
                items = data_json['result']['data']
                for item in items:
                    # item fields: title, url, ctime (unix ts), intro, media_name, keywords
                    try:
                        ts = int(item.get('ctime', 0))
                        dt = datetime.datetime.fromtimestamp(ts)
                        time_str = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        time_str = ""
                        
                    news_item = {
                        "id": item.get('docid', ''),
                        "title": item.get('title', ''),
                        "summary": item.get('intro', '') or item.get('title', ''),
                        "source": item.get('media_name', 'Sina Finance'),
                        "timestamp": time_str,
                        "url": item.get('url', '')
                    }
                    news_data.append(news_item)
                print(f"DEBUG: Fetched {len(news_data)} news items.", flush=True)
                return news_data
    except Exception as e:
        print(f"News fetch failed: {e}", flush=True)
    
    return []

# --- Stock Data (Akshare) ---
@app.get("/api/stock/{symbol}")
def get_stock(symbol: str):
    print(f"DEBUG: Fetching stock {symbol}", flush=True)
    cache_key = f"stock_{symbol}"
    # Temporarily disable cache reading to force fresh fetch
    # if cache_key in stock_cache:
    #     if time.time() - stock_cache[cache_key]['timestamp'] < 300:
    #         print("DEBUG: Using cache")
    #         return stock_cache[cache_key]['data']

    try:
        code = symbol
        # Handle prefixes
        if symbol.startswith('6') or symbol.startswith('5') or symbol.startswith('9'):
            xq_symbol = f"SH{symbol}"
        elif symbol.startswith('0') or symbol.startswith('3') or symbol.startswith('1') or symbol.startswith('2'):
            xq_symbol = f"SZ{symbol}"
        elif symbol.startswith('4') or symbol.startswith('8'):
            xq_symbol = f"BJ{symbol}"
        else:
            xq_symbol = symbol

        # FIX: Use historical data as reliable fallback for current price
        try:
            # STRATEGY 1: Try Sina API (Fastest & Most Reliable for Spot Data)
            # Sina format: var hq_str_sh600036="Name,Open,PreClose,Current,High,Low,Buy,Sell,Vol,Amt,...";
            sina_prefix = ""
            if symbol.startswith('6') or symbol.startswith('5') or symbol.startswith('9'):
                sina_prefix = "sh"
            elif symbol.startswith('0') or symbol.startswith('3') or symbol.startswith('2'):
                sina_prefix = "sz"
            elif symbol.startswith('4') or symbol.startswith('8'):
                sina_prefix = "bj" # Check if Sina supports BJ? Usually yes or different.
            
            if sina_prefix:
                sina_symbol = f"{sina_prefix}{symbol}"
                print(f"DEBUG: Trying Sina API for {sina_symbol}...", flush=True)
                try:
                    sina_url = f"http://hq.sinajs.cn/list={sina_symbol}"
                    sina_headers = {"Referer": "http://finance.sina.com.cn/"}
                    # Try with system proxy first (default session)
                    sina_resp = requests.get(sina_url, headers=sina_headers, timeout=5)
                    if sina_resp.status_code == 200:
                        content = sina_resp.text
                        # var hq_str_sh600036="...";
                        if '="' in content:
                            val = content.split('="')[1].split('"')[0]
                            parts = val.split(',')
                            if len(parts) > 30:
                                name = parts[0]
                                pre_close = float(parts[2])
                                current = float(parts[3])
                                
                                # If market is closed or pre-open, current might be 0? 
                                # Usually PreClose is reliable.
                                if current == 0:
                                    current = pre_close
                                
                                change_pct = 0.0
                                if pre_close > 0:
                                    change_pct = ((current - pre_close) / pre_close) * 100
                                
                                data = {
                                    "symbol": symbol,
                                    "name": name,
                                    "current_price": current,
                                    "change_percent": round(change_pct, 2),
                                    "timestamp": datetime.datetime.now().isoformat()
                                }
                                stock_cache[cache_key] = {
                                    "timestamp": time.time(),
                                    "data": data
                                }
                                save_cache(stock_cache)
                                print(f"DEBUG: Sina API success for {symbol}", flush=True)
                                return data
                except Exception as sina_e:
                    print(f"DEBUG: Sina API failed: {sina_e}", flush=True)

            # STRATEGY 2: Fallback to Akshare History
            # Fetch last 5 days to ensure we get the latest trading day
            end_date = datetime.datetime.now().strftime("%Y%m%d")
            start_date = (datetime.datetime.now() - datetime.timedelta(days=10)).strftime("%Y%m%d")
            print(f"DEBUG: calling ak.stock_zh_a_hist for {symbol} from {start_date} to {end_date}", flush=True)
            
            # Retry loop for Akshare
            df = pd.DataFrame()
            for i in range(5):  # Increased to 5 attempts
                try:
                    df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust="qfq")
                    if not df.empty:
                        break
                except Exception as ak_e:
                    print(f"DEBUG: Akshare attempt {i+1} failed: {ak_e}", flush=True)
                    time.sleep(2) # Increased delay

            if not df.empty:
                print(f"DEBUG: Data found, shape {df.shape}", flush=True)
                last_row = df.iloc[-1]
                price = float(last_row['收盘'])
                # Get change percent if available, else 0
                change_percent = float(last_row['涨跌幅']) if '涨跌幅' in last_row else 0.0
                # Try to get name from stock info if not cached (cache handles name usually)
                # but we can keep the generic name if needed or fetch info
                name = f"股票{symbol}"
                try:
                     info_df = ak.stock_individual_info_em(symbol=symbol)
                     # item, value
                     name_row = info_df[info_df['item'] == '股票简称']
                     if not name_row.empty:
                         name = name_row.iloc[0]['value']
                except:
                    pass
                    
                data = {
                    "symbol": symbol,
                    "name": name,
                    "current_price": price,
                    "change_percent": change_percent,
                    "timestamp": datetime.datetime.now().isoformat()
                }
                
                stock_cache[cache_key] = {
                    "timestamp": time.time(),
                    "data": data
                }
                save_cache(stock_cache)
                return data
            else:
                raise ValueError("No history data found after retries")
        except Exception as inner_e:
            print(f"Stock fetch failed (Akshare): {inner_e}", flush=True)
            
            # Retry mechanism
            print("DEBUG: Retrying with manual requests session...", flush=True)
            
            secid_prefix = "1" if symbol.startswith('6') else "0"
            secid = f"{secid_prefix}.{symbol}"
            
            # Use HTTP instead of HTTPS if possible to avoid SSL proxy issues?
            url = "http://push2his.eastmoney.com/api/qt/stock/kline/get"
            params = {
                "fields1": "f1,f2,f3,f4,f5,f6",
                "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
                "beg": start_date,
                "end": end_date,
                "rtntype": "6",
                "secid": secid,
                "klt": "101",
                "fqt": "1"
            }
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
            }

            # Attempt 2: Default Proxy (using system settings) - RETRY LOOP
            print("DEBUG: Attempt 2 - Default Proxy HTTP (Loop)...", flush=True)
            s2 = requests.Session()
            s2.headers.update(headers)
            
            for i in range(5): # Retry 5 times
                try:
                    resp = s2.get(url, params=params, timeout=10)
                    print(f"DEBUG: Attempt 2 (Try {i+1}) status: {resp.status_code}", flush=True)
                    if resp.status_code == 200:
                        data_json = resp.json()
                        if data_json and data_json.get('data') and data_json['data'].get('klines'):
                            klines = data_json['data']['klines']
                            latest = klines[-1].split(',')
                            price = float(latest[2])
                            name = f"股票{symbol}"
                            data = {
                                "symbol": symbol,
                                "name": name,
                                "current_price": price,
                                "change_percent": 0.0,
                                "timestamp": datetime.datetime.now().isoformat()
                            }
                            return data
                except Exception as e2:
                    print(f"DEBUG: Attempt 2 (Try {i+1}) failed: {e2}", flush=True)
                time.sleep(2)
            
            # Attempt 3: Direct Connection (No Proxy)
            print("DEBUG: Attempt 3 - Direct HTTP (trust_env=False)...", flush=True)
            s3 = requests.Session()
            s3.trust_env = False
            s3.headers.update(headers)
            
            try:
                resp = s3.get(url, params=params, timeout=10)
                print(f"DEBUG: Attempt 3 status: {resp.status_code}", flush=True)
                if resp.status_code == 200:
                    data_json = resp.json()
                    if data_json and data_json.get('data') and data_json['data'].get('klines'):
                        klines = data_json['data']['klines']
                        latest = klines[-1].split(',')
                        price = float(latest[2])
                        name = f"股票{symbol}"
                        data = {
                            "symbol": symbol,
                            "name": name,
                            "current_price": price,
                            "change_percent": 0.0,
                            "timestamp": datetime.datetime.now().isoformat()
                        }
                        return data
            except Exception as e3:
                print(f"DEBUG: Attempt 3 failed: {e3}", flush=True)

            # Attempt 4: IP Direct Fallback (Force IPv4, Bypass DNS/Proxy)
            print("DEBUG: Attempt 4 - Direct IP Fallback...", flush=True)
            try:
                # Resolve IPv4 manually
                import socket
                hostname = "push2his.eastmoney.com"
                ip_addr = socket.gethostbyname(hostname)
                print(f"DEBUG: Resolved {hostname} to {ip_addr}", flush=True)
                
                url_ip = url.replace(hostname, ip_addr)
                headers_ip = headers.copy()
                headers_ip["Host"] = hostname
                
                s4 = requests.Session()
                s4.trust_env = False
                s4.headers.update(headers_ip)
                
                resp = s4.get(url_ip, params=params, timeout=10)
                print(f"DEBUG: Attempt 4 status: {resp.status_code}", flush=True)
                if resp.status_code == 200:
                     data_json = resp.json()
                     if data_json and data_json.get('data') and data_json['data'].get('klines'):
                         klines = data_json['data']['klines']
                         latest = klines[-1].split(',')
                         price = float(latest[2])
                         name = f"股票{symbol}"
                         data = {
                             "symbol": symbol,
                             "name": name,
                             "current_price": price,
                             "change_percent": 0.0,
                             "timestamp": datetime.datetime.now().isoformat()
                         }
                         return data
            except Exception as e4:
                 print(f"DEBUG: Attempt 4 failed: {e4}", flush=True)

            print(f"Stock fetch completely failed, using mock.", flush=True)
            # Fallback to Mock data only if real data fails completely
            import random
            price = round(random.uniform(10, 200), 2)
            name = f"股票{symbol}"
            
            data = {
                "symbol": symbol,
                "name": name,
                "current_price": price,
                "change_percent": 0.0,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            stock_cache[cache_key] = {
                "timestamp": time.time(),
                "data": data
            }
            save_cache(stock_cache)
            return data
    except Exception as e:
        print(f"Stock error: {e}")
        return {"symbol": symbol, "name": symbol, "current_price": 0.0}

# --- Macro Data ---
@app.get("/api/macro")
def get_macro():
    try:
        def parse_date_zh(date_str):
            try:
                # 2008年05月份 -> 2008-05
                s = str(date_str).replace('年', '-').replace('月份', '').replace('月', '')
                parts = s.split('-')
                if len(parts) == 2:
                    return f"{parts[0]}-{parts[1].zfill(2)}"
                return s
            except:
                return str(date_str)

        # 1. CPI
        cpi_data = []
        try:
            df = ak.macro_china_cpi()
            # Columns: 月份, 全国-当月, 全国-同比增长, ...
            df = df.sort_values('月份', ascending=True)
            for _, row in df.tail(24).iterrows():
                 cpi_data.append({
                     "date": parse_date_zh(row['月份']),
                     "value": float(row['全国-同比增长'])
                 })
        except Exception as e:
            print(f"CPI Error: {e}")

        # 2. PPI
        ppi_data = []
        try:
            df = ak.macro_china_ppi()
            # Columns: 月份, 当月, 当月同比增长, ...
            # Check columns if changed, usually '当月同比增长'
            # My test showed: 月份, 当月, 当月同比增长, 累计
            df = df.sort_values('月份', ascending=True)
            for _, row in df.tail(24).iterrows():
                 ppi_data.append({
                     "date": parse_date_zh(row['月份']),
                     "value": float(row['当月同比增长'])
                 })
        except Exception as e:
            print(f"PPI Error: {e}")

        # 3. GDP
        gdp_data = []
        try:
            df = ak.macro_china_gdp()
            # Columns: 季度, 国内生产总值-绝对值(亿元), 国内生产总值-同比增长, ...
            for _, row in df.tail(12).iterrows():
                 gdp_data.append({
                     "date": row['季度'],
                     "value": float(row['国内生产总值-同比增长'])
                 })
        except Exception as e:
             print(f"GDP Error: {e}")

        # 4. LPR (Loan Prime Rate)
        lpr_data = []
        try:
            df = ak.macro_china_lpr()
            # Columns: TRADE_DATE, LPR1Y, LPR5Y
            df = df.sort_values('TRADE_DATE', ascending=True)
            for _, row in df.tail(12).iterrows():
                 lpr_data.append({
                     "date": str(row['TRADE_DATE']),
                     "value_1y": float(row['LPR1Y']),
                     "value_5y": float(row['LPR5Y'])
                 })
        except Exception as e:
            print(f"LPR Error: {e}")

        # 5. Money Supply (M2)
        deposit_data = []
        try:
            df = ak.macro_china_money_supply()
            # Columns: 月份, 货币和准货币(M2)-数量(亿元), 货币和准货币(M2)-同比增长, ...
            df = df.sort_values('月份', ascending=True)
            for _, row in df.tail(12).iterrows():
                 deposit_data.append({
                     "date": parse_date_zh(row['月份']),
                     "value": float(row['货币和准货币(M2)-同比增长'])
                 })
        except Exception as e:
            print(f"Money Supply Error: {e}")

        return {
            "cpi": cpi_data,
            "ppi": ppi_data,
            "lpr": lpr_data,
            "gdp": gdp_data,
            "deposit_volume": deposit_data,
            "exchange_rate": [], 
            "deposit_rates": [], 
            "pmi": [],
            "fx_reserves": []
        }
    except Exception as e:
        print(f"Macro General Error: {e}")
        return {
            "cpi": [], "ppi": [], "lpr": [], "gdp": [], "deposit_volume": []
        }

# --- Stock Basic Info Cache (Tushare) ---
STOCK_BASIC_CACHE_FILE = "stock_basic_cache.json"
stock_basic_cache = {}

def load_stock_basic_cache():
    global stock_basic_cache
    if os.path.exists(STOCK_BASIC_CACHE_FILE):
        try:
            with open(STOCK_BASIC_CACHE_FILE, 'r', encoding='utf-8') as f:
                stock_basic_cache = json.load(f)
        except:
            stock_basic_cache = {}

def save_stock_basic_cache():
    try:
        with open(STOCK_BASIC_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(stock_basic_cache, f, ensure_ascii=False)
    except:
        pass

# Initialize cache
load_stock_basic_cache()

@app.get("/api/stock_info/{symbol}")
def get_stock_info(symbol: str):
    try:
        # Convert symbol to Tushare format
        ts_code = symbol
        if not symbol.endswith(('.SH', '.SZ', '.BJ')):
             if symbol.startswith('6'):
                 ts_code = f"{symbol}.SH"
             elif symbol.startswith(('0', '3')):
                 ts_code = f"{symbol}.SZ"
             elif symbol.startswith(('4', '8')):
                 ts_code = f"{symbol}.BJ"
        
        # 1. Basic Info (Check Cache First)
        info_dict = {}
        use_cache = False
        
        if symbol in stock_basic_cache:
            cached = stock_basic_cache[symbol]
            last_updated = cached.get('updated_at', 0)
            # 30 days * 24 * 3600 = 2592000 seconds
            if time.time() - last_updated < 2592000:
                print(f"DEBUG: Using cached basic info for {symbol}")
                info_dict = cached.get('data', {})
                use_cache = True
        
        if not use_cache:
            print(f"DEBUG: Fetching new basic info for {symbol} from Tushare")
            # Tushare Init
            ts.set_token('75b8d0b573634a0a14e351034c90aee85acf5370f1e865a6a56b7dce')
            pro = ts.pro_api()

            company_df = pd.DataFrame()
            basic_df = pd.DataFrame()
            
            try:
                 company_df = pro.stock_company(ts_code=ts_code)
            except Exception as e:
                 print(f"Tushare stock_company fetch failed: {e}")
    
            try:
                 basic_df = pro.stock_basic(ts_code=ts_code)
            except Exception as e:
                 print(f"Tushare stock_basic fetch failed: {e}")
    
            if not company_df.empty:
                info_dict.update(company_df.iloc[0].to_dict())
            if not basic_df.empty:
                info_dict.update(basic_df.iloc[0].to_dict())
            
            # Save to cache if we got data
            if info_dict:
                stock_basic_cache[symbol] = {
                    "updated_at": time.time(),
                    "data": info_dict
                }
                save_stock_basic_cache()

        # 2. Realtime Indicators (PE, PB, Market Cap)
        # Use Akshare individual info for market data (faster than spot list)
        pe_ttm = 0
        pb = 0
        total_mv = 0 
        float_mv = 0
        
        try:
            # ak.stock_individual_info_em returns a dataframe with 'item' and 'value'
            # Items: 总市值, 流通市值, 市盈率(动), 市净率, 行业, etc.
            em_df = ak.stock_individual_info_em(symbol=symbol)
            em_dict = dict(zip(em_df['item'], em_df['value']))
            
            pe_ttm = em_dict.get('市盈率(动)', 0)
            pb = em_dict.get('市净率', 0)
            total_mv = em_dict.get('总市值', 0) / 100000000
            float_mv = em_dict.get('流通市值', 0) / 100000000
            
            # Fallback for name/industry if Tushare failed
            if 'name' not in info_dict:
                info_dict['name'] = em_dict.get('股票简称', symbol)
            if 'industry' not in info_dict or info_dict['industry'] == '未知':
                info_dict['industry'] = em_dict.get('行业', '未知')
                
        except Exception as e:
            print(f"Akshare market data fetch failed: {e}")
            # Fallback to spot if individual fails (rare)
            try:
                spot_df = ak.stock_zh_a_spot_em()
                stock_spot = spot_df[spot_df['代码'] == symbol]
                if not stock_spot.empty:
                    row = stock_spot.iloc[0]
                    pe_ttm = row.get('市盈率-动态', 0)
                    pb = row.get('市净率', 0)
                    total_mv = row.get('总市值', 0) / 100000000
                    float_mv = row.get('流通市值', 0) / 100000000
            except:
                pass

        # Construct Description
        desc = ""
        if 'introduction' in info_dict:
             desc = info_dict['introduction']
        else:
             desc = f"上市公司: {info_dict.get('name', symbol)}，位于{info_dict.get('industry', '')}行业。"
             if 'setup_date' in info_dict:
                 desc += f" 成立日期: {info_dict['setup_date']}。"

        return {
            "symbol": symbol,
            "name": info_dict.get('name', symbol),
            "industry": info_dict.get('industry', '未知'),
            "area": info_dict.get('area', ''),
            "market": info_dict.get('market', ''),
            "list_date": info_dict.get('list_date', ''),
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
            "province": info_dict.get('province', ''),
            "city": info_dict.get('city', ''),
            "website": info_dict.get('website', ''),
            "email": info_dict.get('email', ''),
            "office": info_dict.get('office', ''),
            "employees": info_dict.get('employees', 0),
            "main_business": info_dict.get('main_business', ''),
            "business_scope": info_dict.get('business_scope', '')
        }
    except Exception as e:
        print(f"Stock info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
