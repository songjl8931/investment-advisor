from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user") # "admin" or "user"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    assets = relationship("Asset", back_populates="owner")
    reports = relationship("Report", back_populates="owner")
    goals = relationship("Goal", back_populates="owner", uselist=False)

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True) # Using String ID to match existing frontend UUIDs
    symbol = Column(String, index=True)
    name = Column(String)
    type = Column(String)
    quantity = Column(Float)
    cost_price = Column(Float)
    current_price = Column(Float) # Can be updated
    currency = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="assets")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String) # Or DateTime, but keeping String to match frontend ISO format for now
    summary = Column(Text)
    content = Column(Text)
    score = Column(Integer)
    model_name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="reports")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    target_profit = Column(Float)
    target_date = Column(String)
    available_capital = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="goals")

class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(String, primary_key=True)
    provider = Column(String)
    name = Column(String)
    api_key = Column(String)
    base_url = Column(String)
    modules = Column(JSON) # List of modules
    is_active = Column(Boolean, default=True)

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    
    # JSON parameters: {
    #   "min_change": float, "max_change": float,
    #   "min_turnover": float, "max_turnover": float,
    #   "min_volume": float, 
    #   "min_market_cap": float, "max_market_cap": float,
    #   "min_volume_ratio": float, # 量比
    #   "check_ma_alignment": bool, # 均线多头
    #   "check_volume_up": bool, # 成交量台阶式上升 (温和放量)
    #   "check_strong_trend": bool, # 分时强势 (均价线上方)
    #   "check_new_high_pullback": bool, # 创新高回踩
    # }
    params = Column(JSON)
    priority = Column(Integer, default=0)
    schedule_time = Column(String, nullable=True) # "09:30"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    executions = relationship("StrategyExecution", back_populates="strategy")

class StrategyExecution(Base):
    __tablename__ = "strategy_executions"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    ai_analysis = Column(Text, nullable=True) # Analysis for this batch

    strategy = relationship("Strategy", back_populates="executions")
    recommendations = relationship("StockRecommendation", back_populates="execution")

class StockRecommendation(Base):
    __tablename__ = "stock_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id")) # Keep for legacy/direct query if needed, or make nullable
    execution_id = Column(Integer, ForeignKey("strategy_executions.id"), nullable=True)
    symbol = Column(String, index=True)
    name = Column(String)
    date = Column(String, index=True) # YYYY-MM-DD
    price = Column(Float)
    change_percent = Column(Float)
    volume_ratio = Column(Float) # 量比
    turnover_rate = Column(Float) # 换手率
    
    # JSON reason: { "hit_criteria": ["change > 3%", "volume_ratio > 2"] }
    reason = Column(JSON)
    
    # ai_analysis removed from here, moved to StrategyExecution
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # strategy = relationship("Strategy", back_populates="recommendations") # Remove back_populates to avoid conflict if we removed it from Strategy
    execution = relationship("StrategyExecution", back_populates="recommendations")
