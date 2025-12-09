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
