from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    publisher_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    taker_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)

    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    service_address: Mapped[str] = mapped_column(String(255), nullable=False)
    service_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    service_contact_name: Mapped[str] = mapped_column(String(50), nullable=False)
    service_contact_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    service_remark: Mapped[str | None] = mapped_column(Text, nullable=True)

    pet_name: Mapped[str] = mapped_column(String(50), nullable=False)
    pet_type: Mapped[str] = mapped_column(String(50), nullable=False)
    pet_breed: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pet_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pet_gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pet_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    pet_feeding_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    pet_health_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
