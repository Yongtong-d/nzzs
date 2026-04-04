from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.auth import get_current_user
from app.common.database import get_db
from app.common.response import ApiResponse, success_response
from app.review.schema import CreateReviewRequest, ReviewItem
from app.review.service import review_service
from app.user.model import User

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ApiResponse[ReviewItem], summary="Create review")
def create_review(
    payload: CreateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[ReviewItem]:
    return success_response(review_service.create_review(db, payload, current_user))


@router.get("/user/{user_id}", response_model=ApiResponse[list[ReviewItem]], summary="List user reviews")
def list_user_reviews(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ApiResponse[list[ReviewItem]]:
    return success_response(review_service.list_user_reviews(db, user_id))
