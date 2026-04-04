from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.schema import LoginResponse, WechatLoginRequest
from app.auth.service import auth_service
from app.common.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse, summary="微信登录")
def login(payload: WechatLoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    return auth_service.login(db, payload)
