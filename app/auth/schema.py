from datetime import datetime

from pydantic import BaseModel, Field

from app.user.role import UserRole


class WechatLoginRequest(BaseModel):
    code: str = Field(..., min_length=1, description="微信登录 code")
    nickname: str = Field(..., min_length=1, max_length=50, description="微信昵称")
    avatar: str = Field(..., min_length=1, description="微信头像 URL")


class UserInfo(BaseModel):
    id: int
    openid: str
    nickname: str
    avatar: str
    role: UserRole
    created_at: datetime
    last_login_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool
    user: UserInfo
