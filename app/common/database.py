from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.exc import OperationalError

from app.common.config import settings


class Base(DeclarativeBase):
    pass


def build_database_url() -> str:
    return (
        f"mysql+pymysql://{settings.mysql_user}:{settings.mysql_password}"
        f"@{settings.mysql_host}:{settings.mysql_port}/{settings.mysql_database}"
        "?charset=utf8mb4"
    )


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        try:
            _engine = create_engine(
                build_database_url(),
                pool_pre_ping=True,
            )
        except ModuleNotFoundError as exc:
            raise RuntimeError("缺少 PyMySQL 依赖，请先安装: pip install pymysql") from exc
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.order.model import Order
    from app.review.model import Review
    from app.service_record.model import ServiceRecord
    from app.user.model import User

    engine = get_engine()
    Base.metadata.create_all(
        bind=engine,
        tables=[User.__table__, Order.__table__, ServiceRecord.__table__, Review.__table__],
    )
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns(User.__tablename__)}
    if "role" not in columns:
        try:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'owner'")
                )
        except OperationalError as exc:
            raise RuntimeError(
                "数据库缺少 users.role 字段，且当前账号没有 ALTER TABLE 权限。"
                "请使用有权限的账号先执行："
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'owner';"
            ) from exc
