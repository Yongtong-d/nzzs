from datetime import datetime

from pydantic import BaseModel, Field


class CreateReviewRequest(BaseModel):
    order_id: int = Field(..., gt=0, description="Order ID")
    reviewer_id: int = Field(..., gt=0, description="Reviewer user ID")
    reviewee_id: int = Field(..., gt=0, description="Reviewee user ID")
    score: int = Field(..., ge=1, le=5, description="Review score")
    content: str = Field(..., min_length=1, max_length=2000, description="Review content")


class ReviewItem(BaseModel):
    id: int
    order_id: int
    reviewer_id: int
    reviewee_id: int
    score: int
    content: str
    created_at: datetime

