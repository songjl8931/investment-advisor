from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, auth, models
from ..auth import get_db, get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, role: str = "user", current_user: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_user = crud.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user, role=role)

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, current_user: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    updated_user = crud.update_user(db, user_id, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    crud.delete_user(db, user_id)
    return {"status": "success"}
