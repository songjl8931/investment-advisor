from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import schemas, crud, models, auth
from ..services import stock_screener
import datetime
import requests
import json
import math
import akshare as ak
import pandas as pd
from ..routers.data import router as data_router # Just to check imports, but we define new router

router = APIRouter(prefix="/api/strategies", tags=["strategies"])

# --- Strategies Management ---

@router.get("/", response_model=List[schemas.Strategy])
def read_strategies(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    return crud.get_strategies(db, current_user.id)

@router.post("/", response_model=schemas.Strategy)
def create_strategy(strategy: schemas.StrategyCreate, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    return crud.create_strategy(db, strategy, current_user.id)

@router.put("/{strategy_id}", response_model=schemas.Strategy)
def update_strategy(strategy_id: int, strategy: schemas.StrategyCreate, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    db_strategy = crud.update_strategy(db, strategy_id, strategy, current_user.id)
    if not db_strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return db_strategy

@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    crud.delete_strategy(db, strategy_id, current_user.id)
    return {"status": "success"}

# --- Execution & Recommendations ---

@router.post("/{strategy_id}/execute", response_model=List[schemas.StockRecommendation])
def execute_strategy(strategy_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    # 1. Get Strategy
    db_strategy = db.query(models.Strategy).filter(models.Strategy.id == strategy_id, models.Strategy.user_id == current_user.id).first()
    if not db_strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
        
    # 2. Run Logic
    results = stock_screener.execute_strategy(db_strategy.params)
    
    # 3. Create Execution Record
    db_exec = crud.create_execution(db, strategy_id)

    # 4. Save Recommendations
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    saved_recs = []
    
    for res in results:
        rec_in = schemas.StockRecommendationCreate(
            strategy_id=strategy_id,
            execution_id=db_exec.id,
            symbol=res['symbol'],
            name=res['name'],
            date=today_str,
            price=res['price'],
            change_percent=res['change_percent'],
            volume_ratio=res['volume_ratio'],
            turnover_rate=res['turnover_rate'],
            reason=res['reason']
        )
        saved_recs.append(crud.create_recommendation(db, rec_in))
        
    return saved_recs

@router.get("/{strategy_id}/executions", response_model=List[schemas.StrategyExecution])
def read_executions(strategy_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    db_strategy = db.query(models.Strategy).filter(models.Strategy.id == strategy_id, models.Strategy.user_id == current_user.id).first()
    if not db_strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return crud.get_executions(db, strategy_id)

@router.get("/executions/{execution_id}/recommendations", response_model=List[schemas.StockRecommendation])
def read_execution_recommendations(execution_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    # Simple check, ideally check ownership via strategy -> user
    return crud.get_recommendations(db, execution_id=execution_id)

@router.delete("/executions/{execution_id}")
def delete_execution(execution_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    # Verify ownership
    db_exec = crud.get_execution(db, execution_id)
    if not db_exec:
         raise HTTPException(status_code=404, detail="Execution not found")
    # In a real app, check if strategy belongs to user
    # db_strategy = db.query(models.Strategy).filter(models.Strategy.id == db_exec.strategy_id, models.Strategy.user_id == current_user.id).first()
    # if not db_strategy: ...
    
    crud.delete_execution(db, execution_id)
    return {"status": "success"}

def fetch_realtime_prices_batch(symbols: List[str]) -> dict:
    if not symbols:
        return {}
    
    # Prepare symbols for Sina
    sina_symbols = []
    symbol_map = {} # sina_code -> original_code
    
    for s in symbols:
        # Ensure clean symbol for API
        s_clean = s.split('.')[0]

        # Simple prefix logic
        prefix = "sh" if s_clean.startswith(('6', '5')) else "sz"
        if s_clean.startswith(('8', '4', '9')): 
             prefix = "bj" 
        
        code = f"{prefix}{s_clean}"
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
        except Exception as e:
            print(f"Batch fetch error: {e}", flush=True)
            
    return price_map

@router.get("/tracking", response_model=List[schemas.StockTrackingItem])
def get_strategy_tracking(
    execution_id: Optional[int] = Query(None),
    strategy_id: Optional[int] = Query(None),
    current_user: models.User = Depends(auth.get_current_active_user), 
    db: Session = Depends(auth.get_db)
):
    # 1. Get recent recommendations (limit 50) joined with Strategy and Execution
    query = db.query(
        models.StockRecommendation, 
        models.StrategyExecution.created_at, 
        models.Strategy.name
    ).join(
        models.StrategyExecution, models.StockRecommendation.execution_id == models.StrategyExecution.id
    ).join(
        models.Strategy, models.StrategyExecution.strategy_id == models.Strategy.id
    ).filter(
        models.Strategy.user_id == current_user.id
    )

    if execution_id:
        query = query.filter(models.StockRecommendation.execution_id == execution_id)
    elif strategy_id:
        query = query.filter(models.StockRecommendation.strategy_id == strategy_id)
    
    results = query.order_by(
        models.StrategyExecution.created_at.desc()
    ).limit(50).all()
    
    if not results:
        return []
        
    # 2. Fetch real-time prices (Optimized: Batch fetch only needed symbols)
    symbols = list(set([rec.symbol for rec, _, _ in results]))
    print(f"DEBUG: Tracking symbols: {symbols}", flush=True)
    price_map = fetch_realtime_prices_batch(symbols)
    print(f"DEBUG: Price Map keys: {list(price_map.keys())}", flush=True)
        
    tracking_items = []
    
    for rec, exec_time, strategy_name in results:
        current_price = price_map.get(rec.symbol)
        # print(f"DEBUG: Symbol {rec.symbol} (RecPrice: {rec.price}) -> Map Price {current_price}", flush=True)
        
        if current_price is None:
             current_price = rec.price # Fallback
             
        try:
            current_price = float(current_price)
            if math.isnan(current_price):
                # print(f"DEBUG: Price is NaN for {rec.symbol}", flush=True)
                current_price = rec.price
        except Exception as e:
            # print(f"DEBUG: Error converting price for {rec.symbol}: {e}", flush=True)
            current_price = rec.price

        if rec.price > 0:
            return_pct = round(((current_price - rec.price) / rec.price) * 100, 2)
        else:
            return_pct = 0.0
            
        # print(f"DEBUG: Final {rec.symbol} -> Rec: {rec.price}, Cur: {current_price}", flush=True)

        tracking_items.append(schemas.StockTrackingItem(
            id=rec.id,
            symbol=rec.symbol,
            name=rec.name,
            strategy_name=strategy_name,
            execution_date=exec_time.strftime("%Y-%m-%d %H:%M"),
            recommend_price=rec.price,
            current_price=current_price,
            return_percent=return_pct,
            execution_id=rec.execution_id if rec.execution_id else 0
        ))
        
    return tracking_items

# --- AI Analysis ---

@router.post("/executions/{execution_id}/analyze")
def analyze_execution(execution_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(auth.get_db)):
    # 1. Get Execution
    db_exec = crud.get_execution(db, execution_id)
    if not db_exec:
        raise HTTPException(status_code=404, detail="Execution not found")

    # 2. Get Recommendations
    recs = crud.get_recommendations(db, execution_id=execution_id)
    if not recs:
        raise HTTPException(status_code=400, detail="No recommendations to analyze")
    
    # Take top 10 to analyze
    top_recs = recs[:10] 
    
    # 3. Prepare Prompt
    stocks_info = "\n".join([
        f"- {r.name} ({r.symbol}): 现价 {r.price}, 涨幅 {r.change_percent}%, 量比 {r.volume_ratio}, 换手 {r.turnover_rate}%"
        for r in top_recs
    ])
    
    prompt = f"""
    请作为一位短线交易专家，分析以下今日选出的股票，给出短线操作建议。
    
    选股策略结果：
    {stocks_info}
    
    请严格按照以下格式输出：

    ### 策略总结
    （在此处简要总结今日市场情绪及最值得关注的 1-3 只股票，重点推荐的股票名称请务必使用 **股票名称** 加粗标记，例如 **贵州茅台**）

    ### 详细分析
    （针对每只股票进行深入分析：）
    1. 分析其上涨动力（基于量比和涨幅）。
    2. 给出具体的短线操作建议（买入区间、止损位、止盈位）。
    3. 提示风险。
    
    ### 综合排序
    （给出推荐优先级排序）
    """
    
    # 4. Call AI
    import os
    import json
    MODELS_FILE = "user_models.json"
    
    model_config = None
    if os.path.exists(MODELS_FILE):
        try:
            with open(MODELS_FILE, 'r', encoding='utf-8') as f:
                models_list = json.load(f)
                # First try to find a model specifically for stock_selection
                for m in models_list:
                    if m.get('is_active') and "stock_selection" in m.get('modules', []):
                        model_config = m
                        break
                
                # Fallback to ai_report if not found
                if not model_config:
                    for m in models_list:
                        if m.get('is_active') and "ai_report" in m.get('modules', []):
                            model_config = m
                            break
        except:
            pass
            
    if not model_config:
        raise HTTPException(status_code=500, detail="No AI model configured for stock_selection or ai_report")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {model_config['api_key']}"
    }
    
    payload = {
        "model": model_config['name'],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }
    
    try:
        print(f"Analyzing with {model_config['provider']}...")
        resp = requests.post(model_config['base_url'], headers=headers, json=payload, timeout=120)
        if resp.status_code != 200:
             raise HTTPException(status_code=resp.status_code, detail=resp.text)
        
        result_json = resp.json()
        ai_content = result_json['choices'][0]['message']['content']
        
        # Save Analysis to Execution Record
        db_exec.ai_analysis = ai_content
        db.commit()
            
        return {"analysis": ai_content}
        
    except Exception as e:
        print(f"AI Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
