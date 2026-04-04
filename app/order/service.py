from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.order.model import Order
from app.order.schema import (
    CancelOrderRequest,
    CreateOrderRequest,
    OrderDetail,
    OrderStatus,
    OrderSummary,
    OrderUserInfo,
    PetInfo,
    ServiceInfo,
)
from app.user.model import User
from app.user.role import UserRole


class OrderService:
    @staticmethod
    def _ensure_owner(user: User) -> None:
        if user.role != UserRole.OWNER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners can publish orders",
            )

    @staticmethod
    def _ensure_feeder(user: User) -> None:
        if user.role != UserRole.FEEDER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only feeders can operate this action",
            )

    @staticmethod
    def _get_order_or_404(db: Session, order_id: int) -> Order:
        order = db.get(Order, order_id)
        if order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return order

    @staticmethod
    def _ensure_status(order: Order, expected: set[OrderStatus]) -> None:
        if OrderStatus(order.status) not in expected:
            allowed = ", ".join(item.value for item in expected)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order status, expected one of: {allowed}",
            )

    @staticmethod
    def _build_user_info(user: User | None) -> OrderUserInfo | None:
        if user is None:
            return None
        return OrderUserInfo(
            id=user.id,
            nickname=user.nickname,
            avatar=user.avatar,
        )

    def _build_service_info(self, order: Order) -> ServiceInfo:
        return ServiceInfo(
            service_type=order.service_type,
            service_date=order.service_date,
            service_address=order.service_address,
            service_price=order.service_price,
            service_contact_name=order.service_contact_name,
            service_contact_phone=order.service_contact_phone,
            service_remark=order.service_remark,
        )

    def _build_pet_info(self, order: Order) -> PetInfo:
        return PetInfo(
            pet_name=order.pet_name,
            pet_type=order.pet_type,
            pet_breed=order.pet_breed,
            pet_age=order.pet_age,
            pet_gender=order.pet_gender,
            pet_weight_kg=order.pet_weight_kg,
            pet_feeding_requirements=order.pet_feeding_requirements,
            pet_health_notes=order.pet_health_notes,
        )

    def _build_order_summary(self, db: Session, order: Order) -> OrderSummary:
        publisher = db.get(User, order.publisher_id)
        taker = db.get(User, order.taker_id) if order.taker_id else None
        return OrderSummary(
            id=order.id,
            status=OrderStatus(order.status),
            publisher=self._build_user_info(publisher),
            taker=self._build_user_info(taker),
            service=self._build_service_info(order),
            pet=self._build_pet_info(order),
            created_at=order.created_at,
            accepted_at=order.accepted_at,
            started_at=order.started_at,
            finished_at=order.finished_at,
            cancelled_at=order.cancelled_at,
        )

    def _build_order_detail(self, db: Session, order: Order) -> OrderDetail:
        summary = self._build_order_summary(db, order)
        return OrderDetail(
            **summary.model_dump(),
            cancel_reason=order.cancel_reason,
            updated_at=order.updated_at,
        )

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def create_order(self, db: Session, payload: CreateOrderRequest, current_user: User) -> OrderDetail:
        self._ensure_owner(current_user)

        order = Order(
            publisher_id=current_user.id,
            status=OrderStatus.PENDING.value,
            service_type=payload.service.service_type,
            service_date=payload.service.service_date,
            service_address=payload.service.service_address,
            service_price=payload.service.service_price,
            service_contact_name=payload.service.service_contact_name,
            service_contact_phone=payload.service.service_contact_phone,
            service_remark=payload.service.service_remark,
            pet_name=payload.pet.pet_name,
            pet_type=payload.pet.pet_type,
            pet_breed=payload.pet.pet_breed,
            pet_age=payload.pet.pet_age,
            pet_gender=payload.pet.pet_gender,
            pet_weight_kg=payload.pet.pet_weight_kg,
            pet_feeding_requirements=payload.pet.pet_feeding_requirements,
            pet_health_notes=payload.pet.pet_health_notes,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return self._build_order_detail(db, order)

    def list_hall_orders(self, db: Session) -> list[OrderSummary]:
        orders = (
            db.query(Order)
            .filter(Order.status == OrderStatus.PENDING.value)
            .order_by(Order.created_at.desc())
            .all()
        )
        return [self._build_order_summary(db, order) for order in orders]

    def list_my_published_orders(self, db: Session, current_user: User) -> list[OrderSummary]:
        orders = (
            db.query(Order)
            .filter(Order.publisher_id == current_user.id)
            .order_by(Order.created_at.desc())
            .all()
        )
        return [self._build_order_summary(db, order) for order in orders]

    def list_my_taken_orders(self, db: Session, current_user: User) -> list[OrderSummary]:
        orders = (
            db.query(Order)
            .filter(Order.taker_id == current_user.id)
            .order_by(Order.created_at.desc())
            .all()
        )
        return [self._build_order_summary(db, order) for order in orders]

    def get_order_detail(self, db: Session, order_id: int) -> OrderDetail:
        order = self._get_order_or_404(db, order_id)
        return self._build_order_detail(db, order)

    def accept_order(self, db: Session, order_id: int, current_user: User) -> OrderDetail:
        self._ensure_feeder(current_user)
        order = self._get_order_or_404(db, order_id)
        self._ensure_status(order, {OrderStatus.PENDING})
        if order.publisher_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot accept your own order")

        order.status = OrderStatus.ACCEPTED.value
        order.taker_id = current_user.id
        order.accepted_at = self._now()
        db.add(order)
        db.commit()
        db.refresh(order)
        return self._build_order_detail(db, order)

    def start_order(self, db: Session, order_id: int, current_user: User) -> OrderDetail:
        self._ensure_feeder(current_user)
        order = self._get_order_or_404(db, order_id)
        self._ensure_status(order, {OrderStatus.ACCEPTED})
        if order.taker_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the taker can start service")

        order.status = OrderStatus.SERVING.value
        order.started_at = self._now()
        db.add(order)
        db.commit()
        db.refresh(order)
        return self._build_order_detail(db, order)

    def finish_order(self, db: Session, order_id: int, current_user: User) -> OrderDetail:
        self._ensure_feeder(current_user)
        order = self._get_order_or_404(db, order_id)
        self._ensure_status(order, {OrderStatus.SERVING})
        if order.taker_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the taker can finish service")

        order.status = OrderStatus.COMPLETED.value
        order.finished_at = self._now()
        db.add(order)
        db.commit()
        db.refresh(order)
        return self._build_order_detail(db, order)

    def cancel_order(
        self,
        db: Session,
        order_id: int,
        payload: CancelOrderRequest,
        current_user: User,
    ) -> OrderDetail:
        order = self._get_order_or_404(db, order_id)
        self._ensure_status(order, {OrderStatus.PENDING, OrderStatus.ACCEPTED})

        is_publisher = order.publisher_id == current_user.id
        is_taker = order.taker_id == current_user.id
        if not is_publisher and not is_taker:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permission to cancel this order")

        if is_taker and order.status != OrderStatus.ACCEPTED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Taker can only cancel accepted orders",
            )

        order.status = OrderStatus.CANCELLED.value
        order.cancelled_at = self._now()
        order.cancel_reason = payload.reason
        db.add(order)
        db.commit()
        db.refresh(order)
        return self._build_order_detail(db, order)


order_service = OrderService()
