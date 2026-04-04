from datetime import datetime

from pydantic import BaseModel, Field

from app.user.role import AVAILABLE_USER_ROLES, UserRole


class CurrentRoleUserInfo(BaseModel):
    id: int
    openid: str
    nickname: str
    avatar: str
    role: UserRole
    created_at: datetime
    last_login_at: datetime


class CurrentRoleResponse(BaseModel):
    role: UserRole
    available_roles: list[UserRole] = AVAILABLE_USER_ROLES
    user: CurrentRoleUserInfo


class SwitchRoleRequest(BaseModel):
    role: UserRole = Field(..., description="Target role")


class SwitchRoleResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    available_roles: list[UserRole] = AVAILABLE_USER_ROLES
    user: CurrentRoleUserInfo
