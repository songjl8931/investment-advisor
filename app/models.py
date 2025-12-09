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
