from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    SERVING = "serving"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ServiceInfo(BaseModel):
    service_type: str = Field(..., min_length=1, max_length=50, description="服务类型")
    service_date: date = Field(..., description="服务日期")
    service_address: str = Field(..., min_length=1, max_length=255, description="服务地址")
    service_price: Decimal = Field(..., ge=0, description="服务价格")
    service_contact_name: str = Field(..., min_length=1, max_length=50, description="联系人")
    service_contact_phone: str = Field(..., min_length=1, max_length=30, description="联系电话")
    service_remark: str | None = Field(default=None, max_length=2000, description="服务备注")


class PetInfo(BaseModel):
    pet_name: str = Field(..., min_length=1, max_length=50, description="宠物名称")
    pet_type: str = Field(..., min_length=1, max_length=50, description="宠物类型")
    pet_breed: str | None = Field(default=None, max_length=50, description="宠物品种")
    pet_age: int | None = Field(default=None, ge=0, le=100, description="宠物年龄")
    pet_gender: str | None = Field(default=None, max_length=20, description="宠物性别")
    pet_weight_kg: Decimal | None = Field(default=None, ge=0, description="体重(kg)")
    pet_feeding_requirements: str | None = Field(default=None, max_length=2000, description="喂养要求")
    pet_health_notes: str | None = Field(default=None, max_length=2000, description="健康说明")


class CreateOrderRequest(BaseModel):
    service: ServiceInfo
    pet: PetInfo


class CancelOrderRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255, description="取消原因")


class OrderUserInfo(BaseModel):
    id: int
    nickname: str
    avatar: str


class OrderSummary(BaseModel):
    id: int
    status: OrderStatus
    publisher: OrderUserInfo
    taker: OrderUserInfo | None
    service: ServiceInfo
    pet: PetInfo
    created_at: datetime
    accepted_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    cancelled_at: datetime | None


class OrderDetail(OrderSummary):
    cancel_reason: str | None
    updated_at: datetime
