from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, models, auth
from ..services import stock_screener
import datetime
import requests
import json
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
    
    请针对每只股票：
    1. 分析其上涨动力（基于量比和涨幅）。
    2. 给出具体的短线操作建议（买入区间、止损位、止盈位）。
    3. 提示风险。
    
    最后给出一个综合排序。
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
                for m in models_list:
                    if m.get('is_active') and "ai_report" in m.get('modules', []):
                        model_config = m
                        break
        except:
            pass
            
    if not model_config:
        raise HTTPException(status_code=500, detail="No AI model configured for ai_report")

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
