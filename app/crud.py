from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_password_hash

def get_user(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate, role: str = "user"):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    if user_update.role is not None:
        db_user.role = user_update.role
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    # Optional: Soft delete or hard delete. Hard delete for now.
    # Note: This might fail if there are cascading constraints not set up for cascade delete
    # but our models don't explicitly set cascade="all, delete" on relationships in models.py
    # except defaults. Let's try hard delete.
    db.query(models.User).filter(models.User.id == user_id).delete()
    db.commit()

# Assets
def get_assets(db: Session, user_id: int):
    return db.query(models.Asset).filter(models.Asset.user_id == user_id).all()

def create_asset(db: Session, asset: schemas.AssetCreate, user_id: int):
    # Using dict conversion properly. Pydantic models have camelCase fields but our DB models use snake_case in some places?
    # Actually schemas.AssetBase defines camelCase (costPrice, currentPrice) to match frontend
    # But DB models use snake_case (cost_price, current_price).
    # We need to map them.
    
    db_asset = models.Asset(
        id=asset.id,
        symbol=asset.symbol,
        name=asset.name,
        type=asset.type,
        quantity=asset.quantity,
        cost_price=asset.costPrice,
        current_price=asset.currentPrice,
        currency=asset.currency,
        user_id=user_id
    )
    
    db.merge(db_asset) # Use merge to handle updates if ID exists
    db.commit()
    return db_asset

def delete_asset(db: Session, asset_id: str, user_id: int):
    db.query(models.Asset).filter(models.Asset.id == asset_id, models.Asset.user_id == user_id).delete()
    db.commit()

def save_assets_bulk(db: Session, assets: list[schemas.AssetCreate], user_id: int):
    # First delete all assets for this user (simple sync strategy as per previous file-based approach)
    # Or we can merge. Previous app replaced the whole list.
    db.query(models.Asset).filter(models.Asset.user_id == user_id).delete()
    
    for asset in assets:
        create_asset(db, asset, user_id)
    # create_asset commits individually, which is slow but fine for small data.
    # We already did delete, so create_asset will insert.

# Reports
def get_reports(db: Session, user_id: int):
    return db.query(models.Report).filter(models.Report.user_id == user_id).order_by(models.Report.timestamp.desc()).all()

def create_report(db: Session, report: schemas.ReportCreate, user_id: int):
    db_report = models.Report(**report.dict(), user_id=user_id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def save_reports_bulk(db: Session, reports: list[schemas.ReportCreate], user_id: int):
    db.query(models.Report).filter(models.Report.user_id == user_id).delete()
    for r in reports:
        db_report = models.Report(**r.dict(), user_id=user_id)
        db.add(db_report)
    db.commit()

# Goals
def get_goal(db: Session, user_id: int):
    return db.query(models.Goal).filter(models.Goal.user_id == user_id).first()

def create_or_update_goal(db: Session, goal: schemas.GoalCreate, user_id: int):
    db_goal = db.query(models.Goal).filter(models.Goal.user_id == user_id).first()
    if db_goal:
        db_goal.target_profit = goal.targetProfit
        db_goal.target_date = goal.targetDate
        db_goal.available_capital = goal.availableCapital
    else:
        db_goal = models.Goal(
            target_profit=goal.targetProfit,
            target_date=goal.targetDate,
            available_capital=goal.availableCapital,
            user_id=user_id
        )
        db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

# Models
def get_models(db: Session):
    return db.query(models.ModelConfig).all()

def save_models_bulk(db: Session, configs: list[schemas.ModelConfigCreate]):
    # Replace all? Or merge? Let's replace for simplicity as per previous file-based behavior
    db.query(models.ModelConfig).delete()
    for c in configs:
        db_config = models.ModelConfig(**c.dict())
        db.add(db_config)
    db.commit()

# Strategies
def get_strategies(db: Session, user_id: int):
    return db.query(models.Strategy).filter(models.Strategy.user_id == user_id).order_by(models.Strategy.priority.desc()).all()

def create_strategy(db: Session, strategy: schemas.StrategyCreate, user_id: int):
    db_strategy = models.Strategy(**strategy.dict(), user_id=user_id)
    db.add(db_strategy)
    db.commit()
    db.refresh(db_strategy)
    return db_strategy

def update_strategy(db: Session, strategy_id: int, strategy: schemas.StrategyCreate, user_id: int):
    db_strategy = db.query(models.Strategy).filter(models.Strategy.id == strategy_id, models.Strategy.user_id == user_id).first()
    if db_strategy:
        for key, value in strategy.dict().items():
            setattr(db_strategy, key, value)
        db.commit()
        db.refresh(db_strategy)
    return db_strategy

def delete_strategy(db: Session, strategy_id: int, user_id: int):
    db.query(models.Strategy).filter(models.Strategy.id == strategy_id, models.Strategy.user_id == user_id).delete()
    db.commit()

# Strategy Executions
def get_executions(db: Session, strategy_id: int):
    return db.query(models.StrategyExecution).filter(models.StrategyExecution.strategy_id == strategy_id).order_by(models.StrategyExecution.created_at.desc()).all()

def get_execution(db: Session, execution_id: int):
    return db.query(models.StrategyExecution).filter(models.StrategyExecution.id == execution_id).first()

def create_execution(db: Session, strategy_id: int):
    db_exec = models.StrategyExecution(strategy_id=strategy_id)
    db.add(db_exec)
    db.commit()
    db.refresh(db_exec)
    return db_exec

def delete_execution(db: Session, execution_id: int):
    # Recommendations should be deleted by cascade or manually
    # Assuming cascade not set up perfectly in DB, delete manually
    db.query(models.StockRecommendation).filter(models.StockRecommendation.execution_id == execution_id).delete()
    db.query(models.StrategyExecution).filter(models.StrategyExecution.id == execution_id).delete()
    db.commit()

# Stock Recommendations
def get_recommendations(db: Session, strategy_id: int = None, execution_id: int = None):
    q = db.query(models.StockRecommendation)
    if execution_id:
        q = q.filter(models.StockRecommendation.execution_id == execution_id)
    elif strategy_id:
        q = q.filter(models.StockRecommendation.strategy_id == strategy_id)
    
    return q.order_by(models.StockRecommendation.date.desc()).all()

def create_recommendation(db: Session, recommendation: schemas.StockRecommendationCreate):
    db_rec = models.StockRecommendation(**recommendation.dict())
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    return db_rec

def save_recommendations_bulk(db: Session, recommendations: list[schemas.StockRecommendationCreate], strategy_id: int):
    # Optional: Clear old recommendations for this strategy/date? 
    # For now, just append. Or maybe clear today's before appending to avoid duplicates.
    # Let's assume the caller handles logic or we just append.
    for r in recommendations:
        create_recommendation(db, r)
