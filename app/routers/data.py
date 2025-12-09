from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, auth, models
from ..auth import get_db

router = APIRouter(prefix="/api", tags=["data"])

# Assets
@router.get("/assets", response_model=List[schemas.AssetBase])
def read_assets(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    assets = crud.get_assets(db, current_user.id)
    # Convert DB models to Pydantic schemas (mapping snake_case to camelCase)
    return [
        schemas.AssetBase(
            id=a.id,
            symbol=a.symbol,
            name=a.name,
            type=a.type,
            quantity=a.quantity,
            costPrice=a.cost_price,
            currentPrice=a.current_price,
            currency=a.currency
        ) for a in assets
    ]

@router.post("/assets")
def save_assets(assets: List[schemas.AssetCreate], current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    crud.save_assets_bulk(db, assets, current_user.id)
    return {"status": "success"}

# Reports
@router.get("/reports", response_model=List[schemas.ReportBase])
def read_reports(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.get_reports(db, current_user.id)

@router.post("/reports")
def save_reports(reports: List[schemas.ReportCreate], current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    crud.save_reports_bulk(db, reports, current_user.id)
    return {"status": "success"}

# Goals
@router.get("/goals", response_model=schemas.GoalBase)
def read_goals(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    goal = crud.get_goal(db, current_user.id)
    if not goal:
        return {"targetProfit": 0, "targetDate": "", "availableCapital": 0}
    return schemas.GoalBase(
        targetProfit=goal.target_profit,
        targetDate=goal.target_date,
        availableCapital=goal.available_capital
    )

@router.post("/goals")
def save_goals(goal: schemas.GoalCreate, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    crud.create_or_update_goal(db, goal, current_user.id)
    return {"status": "success"}

# Models (Admin only)
@router.get("/models", response_model=List[schemas.ModelConfigBase])
def read_models(current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    return crud.get_models(db)

@router.post("/models")
def save_models(models: List[schemas.ModelConfigCreate], current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    crud.save_models_bulk(db, models)
    return {"status": "success"}
