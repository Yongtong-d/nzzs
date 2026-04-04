from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.order.model import Order
from app.order.schema import OrderStatus
from app.review.model import Review
from app.review.schema import CreateReviewRequest, ReviewItem
from app.user.model import User


class ReviewService:
    @staticmethod
    def _get_order_or_404(db: Session, order_id: int) -> Order:
        order = db.get(Order, order_id)
        if order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return order

    @staticmethod
    def _get_user_or_404(db: Session, user_id: int, field_name: str) -> User:
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{field_name} user not found",
            )
        return user

    @staticmethod
    def _ensure_order_completed(order: Order) -> None:
        if order.status != OrderStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only completed orders can be reviewed",
            )

    @staticmethod
    def _ensure_participants_match(order: Order, payload: CreateReviewRequest) -> None:
        participants = {order.publisher_id, order.taker_id}
        if None in participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is missing required participants",
            )
        if payload.reviewer_id == payload.reviewee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewer and reviewee must be different users",
            )
        if payload.reviewer_id not in participants or payload.reviewee_id not in participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewer and reviewee must belong to the order",
            )

    @staticmethod
    def _ensure_not_reviewed(db: Session, order_id: int, reviewer_id: int) -> None:
        existing = (
            db.query(Review)
            .filter(Review.order_id == order_id, Review.reviewer_id == reviewer_id)
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewer has already reviewed this order",
            )

    @staticmethod
    def _ensure_reviewer_is_current_user(payload: CreateReviewRequest, current_user: User) -> None:
        if payload.reviewer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Reviewer must be the current user",
            )

    @staticmethod
    def _build_review_item(review: Review) -> ReviewItem:
        return ReviewItem(
            id=review.id,
            order_id=review.order_id,
            reviewer_id=review.reviewer_id,
            reviewee_id=review.reviewee_id,
            score=review.score,
            content=review.content,
            created_at=review.created_at,
        )

    def create_review(self, db: Session, payload: CreateReviewRequest, current_user: User) -> ReviewItem:
        self._ensure_reviewer_is_current_user(payload, current_user)
        order = self._get_order_or_404(db, payload.order_id)
        self._ensure_order_completed(order)
        self._ensure_participants_match(order, payload)
        self._get_user_or_404(db, payload.reviewer_id, "Reviewer")
        self._get_user_or_404(db, payload.reviewee_id, "Reviewee")
        self._ensure_not_reviewed(db, payload.order_id, payload.reviewer_id)

        review = Review(
            order_id=payload.order_id,
            reviewer_id=payload.reviewer_id,
            reviewee_id=payload.reviewee_id,
            score=payload.score,
            content=payload.content,
        )
        db.add(review)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewer has already reviewed this order",
            ) from exc
        db.refresh(review)
        return self._build_review_item(review)

    def list_user_reviews(self, db: Session, user_id: int) -> list[ReviewItem]:
        self._get_user_or_404(db, user_id, "Reviewee")
        reviews = (
            db.query(Review)
            .filter(Review.reviewee_id == user_id)
            .order_by(Review.created_at.desc(), Review.id.desc())
            .all()
        )
        return [self._build_review_item(review) for review in reviews]


review_service = ReviewService()
