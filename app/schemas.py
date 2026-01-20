from pydantic import BaseModel
from typing import List, Optional, Any

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: Optional[Any] = None

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    username: str
    password: str

# Asset
class AssetBase(BaseModel):
    id: str
    symbol: str
    name: str
    type: str
    quantity: float
    costPrice: float
    currentPrice: float
    currency: str

class AssetCreate(AssetBase):
    pass

class Asset(AssetBase):
    user_id: int

    class Config:
        orm_mode = True

# Report
class ReportBase(BaseModel):
    id: str
    timestamp: str
    summary: str
    content: str
    score: int
    model_name: str

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    user_id: int
    
    class Config:
        orm_mode = True

# Goal
class GoalBase(BaseModel):
    targetProfit: float
    targetDate: str
    availableCapital: float

class GoalCreate(GoalBase):
    pass

class Goal(GoalBase):
    user_id: int

    class Config:
        orm_mode = True

# ModelConfig
class ModelConfigBase(BaseModel):
    id: str
    provider: str
    name: str
    api_key: str
    base_url: str
    modules: List[str]

class ModelConfigCreate(ModelConfigBase):
    pass

class ModelConfig(ModelConfigBase):
    is_active: bool

    class Config:
        orm_mode = True

# Strategy
class StrategyBase(BaseModel):
    name: str
    description: Optional[str] = None
    params: dict
    priority: int = 0
    schedule_time: Optional[str] = None
    is_active: bool = True

class StrategyCreate(StrategyBase):
    pass

class Strategy(StrategyBase):
    id: int
    user_id: int
    created_at: Any

    class Config:
        orm_mode = True

# Strategy Execution
class StrategyExecutionBase(BaseModel):
    strategy_id: int
    created_at: Any
    ai_analysis: Optional[str] = None

class StrategyExecution(StrategyExecutionBase):
    id: int

    class Config:
        orm_mode = True

# Stock Recommendation
class StockRecommendationBase(BaseModel):
    symbol: str
    name: str
    date: str
    price: float
    change_percent: float
    volume_ratio: float
    turnover_rate: float
    reason: dict

class StockRecommendationCreate(StockRecommendationBase):
    strategy_id: int
    execution_id: int

class StockRecommendation(StockRecommendationBase):
    id: int
    strategy_id: int
    execution_id: Optional[int] = None
    created_at: Any
    strategy_name: Optional[str] = None # Helper for UI

    class Config:
        orm_mode = True

class StockTrackingItem(BaseModel):
    id: int
    symbol: str
    name: str
    strategy_name: str
    execution_date: str
    recommend_price: float
    current_price: float
    return_percent: float
    execution_id: int
