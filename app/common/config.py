import os
from pathlib import Path

from pydantic import BaseModel


def load_local_env() -> None:
    env_file = Path(__file__).resolve().parents[2] / '.env.local'
    if not env_file.exists():
        return

    for raw_line in env_file.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_local_env()


class Settings(BaseModel):
    jwt_secret_key: str = os.getenv('JWT_SECRET_KEY', 'replace-this-with-a-secure-secret')
    jwt_algorithm: str = 'HS256'
    jwt_expire_minutes: int = 60 * 24 * 7
    mysql_host: str = os.getenv('MYSQL_HOST', '127.0.0.1')
    mysql_port: int = int(os.getenv('MYSQL_PORT', '3306'))
    mysql_database: str = os.getenv('MYSQL_DATABASE', 'nzzs')
    mysql_user: str = os.getenv('MYSQL_USER', 'nzzs_user')
    mysql_password: str = os.getenv('MYSQL_PASSWORD', 'nzzs_user')
    wechat_appid: str = os.getenv('WECHAT_APPID', 'wxb0d5659ad98dc07f')
    wechat_secret: str = os.getenv('WECHAT_SECRET', '')
    wechat_dev_fallback_enabled: bool = os.getenv('WECHAT_DEV_FALLBACK_ENABLED', '1') == '1'


settings = Settings()
