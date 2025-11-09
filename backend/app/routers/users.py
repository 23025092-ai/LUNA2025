from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..deps import get_current_user
from ..schemas import UserOut
from ..utils.auth import hash_password  # used to hash new passwords

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), user = Depends(get_current_user)):
    return user

@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    - admin: return all users
    - non-admin: return only their own user record (as a single-element list)
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if getattr(current_user, "role", None) == "admin":
        users = db.query(models.User).all()
        return users

    # non-admin: return only the current user (list to match response_model)
    # ensure fresh object from DB so relationships/fields are available
    user = db.query(models.User).filter(models.User.id == getattr(current_user, "id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return [user]

@router.delete("/{user_id}", response_model=dict)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # admin-only
    if not current_user or getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
    return {"detail": "deleted"}

@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: dict = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Update user fields.
    - admin: may update any allowed field including 'role'
    - non-admin: may update only their own record and not change 'role'
    Accepts a JSON object with fields to change. If 'password' is provided it will be hashed.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_admin = getattr(current_user, "role", None) == "admin"
    if not is_admin and getattr(current_user, "id", None) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    # allowed update fields for non-admins/admins
    editable = {"username", "full_name", "email", "group_name"}
    if is_admin:
        editable.add("role")

    # handle password separately if provided
    if "password" in payload:
        pw = payload.pop("password")
        # only set a new password when a non-empty value is provided
        if pw:
            try:
                user.password_hash = hash_password(pw)
            except Exception as e:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to set password")

    # apply other allowed fields
    for key, value in payload.items():
        if key in editable:
            setattr(user, key, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user