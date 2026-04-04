from datetime import datetime

from sqlalchemy.orm import Session

from app.auth.schema import WechatLoginRequest
from app.user.model import User
from app.user.role import UserRole


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_openid(self, openid: str) -> User | None:
        return self.db.query(User).filter(User.openid == openid).first()

    def create(self, payload: WechatLoginRequest, openid: str, now: datetime) -> User:
        user = User(
            openid=openid,
            nickname=payload.nickname,
            avatar=payload.avatar,
            role=UserRole.OWNER.value,
            created_at=now,
            last_login_at=now,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def update_login_profile(self, user: User, payload: WechatLoginRequest, now: datetime) -> User:
        user.nickname = payload.nickname
        user.avatar = payload.avatar
        user.last_login_at = now
        self.db.commit()
        self.db.refresh(user)
        return user
