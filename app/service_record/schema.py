from datetime import datetime

from pydantic import BaseModel, Field


class CreateServiceRecordRequest(BaseModel):
    order_id: int = Field(..., gt=0, description="Order ID")
    content: str = Field(..., min_length=1, max_length=2000, description="Service record content")
    image_url: str | None = Field(default=None, max_length=500, description="Image URL")
    checkin_time: datetime = Field(..., description="Check-in time")
    location_text: str | None = Field(default=None, max_length=255, description="Location text")


class ServiceRecordItem(BaseModel):
    id: int
    order_id: int
    content: str
    image_url: str | None
    checkin_time: datetime
    location_text: str | None
    created_by: int
    created_at: datetime

