import hashlib
import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.repository import UserRepository
from app.auth.schema import LoginResponse, UserInfo, WechatLoginRequest
from app.common.config import settings
from app.common.security import create_access_token


class AuthService:
    @staticmethod
    def _build_dev_openid(code: str) -> str:
        digest = hashlib.sha256(code.encode('utf-8')).hexdigest()[:24]
        return f'dev_{digest}'

    def _fallback_openid(self, code: str) -> str:
        if settings.wechat_dev_fallback_enabled:
            return self._build_dev_openid(code)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail='WeChat login is unavailable right now. Please try again later.',
        )

    def _get_wechat_openid(self, code: str) -> str:
        if not settings.wechat_appid or not settings.wechat_secret:
            return self._fallback_openid(code)

        query = urlencode(
            {
                'appid': settings.wechat_appid,
                'secret': settings.wechat_secret,
                'js_code': code,
                'grant_type': 'authorization_code',
            }
        )
        url = f'https://api.weixin.qq.com/sns/jscode2session?{query}'

        try:
            with urlopen(url, timeout=10) as response:
                payload = json.loads(response.read().decode('utf-8'))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            return self._fallback_openid(code)

        openid = payload.get('openid')
        errcode = payload.get('errcode')
        if errcode or not openid:
            return self._fallback_openid(code)

        return openid

    def login(self, db: Session, payload: WechatLoginRequest) -> LoginResponse:
        user_repository = UserRepository(db)
        now = datetime.now(timezone.utc)
        openid = self._get_wechat_openid(payload.code)
        user = user_repository.get_by_openid(openid)
        is_new_user = user is None

        if user is None:
            user = user_repository.create(payload, openid, now)
        else:
            user = user_repository.update_login_profile(user, payload, now)

        token = create_access_token(
            subject=str(user.id),
            extra_claims={
                'openid': user.openid,
                'nickname': user.nickname,
                'role': user.role,
            },
        )
        return LoginResponse(
            access_token=token,
            is_new_user=is_new_user,
            user=UserInfo(
                id=user.id,
                openid=user.openid,
                nickname=user.nickname,
                avatar=user.avatar,
                role=user.role,
                real_name=user.real_name,
                phone=user.phone,
                id_card=user.id_card,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
            ),
        )


auth_service = AuthService()
