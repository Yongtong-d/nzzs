from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

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
            raise RuntimeError('Missing dependency PyMySQL. Please install with: pip install pymysql') from exc
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
    columns = {column['name'] for column in inspector.get_columns(User.__tablename__)}

    try:
        with engine.begin() as connection:
            if 'role' not in columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'feeder'")
                )
            connection.execute(
                text("ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'feeder'")
            )
            if 'real_name' not in columns:
                connection.execute(text('ALTER TABLE users ADD COLUMN real_name VARCHAR(50) NULL'))
            if 'phone' not in columns:
                connection.execute(text('ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL'))
            if 'id_card' not in columns:
                connection.execute(text('ALTER TABLE users ADD COLUMN id_card VARCHAR(32) NULL'))
    except OperationalError as exc:
        raise RuntimeError('Failed to migrate users table. Please verify ALTER TABLE permissions.') from exc
