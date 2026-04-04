from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.order.model import Order
from app.service_record.model import ServiceRecord
from app.service_record.schema import CreateServiceRecordRequest, ServiceRecordItem
from app.user.model import User


class ServiceRecordService:
    @staticmethod
    def _get_order_or_404(db: Session, order_id: int) -> Order:
        order = db.get(Order, order_id)
        if order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return order

    @staticmethod
    def _ensure_create_permission(order: Order, current_user: User) -> None:
        if order.taker_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the taker can create service records",
            )

    @staticmethod
    def _ensure_view_permission(order: Order, current_user: User) -> None:
        if current_user.id not in {order.publisher_id, order.taker_id}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the owner or taker can view service records",
            )

    @staticmethod
    def _build_record_item(record: ServiceRecord) -> ServiceRecordItem:
        return ServiceRecordItem(
            id=record.id,
            order_id=record.order_id,
            content=record.content,
            image_url=record.image_url,
            checkin_time=record.checkin_time,
            location_text=record.location_text,
            created_by=record.created_by,
            created_at=record.created_at,
        )

    def create_record(
        self,
        db: Session,
        payload: CreateServiceRecordRequest,
        current_user: User,
    ) -> ServiceRecordItem:
        order = self._get_order_or_404(db, payload.order_id)
        self._ensure_create_permission(order, current_user)

        record = ServiceRecord(
            order_id=payload.order_id,
            content=payload.content,
            image_url=payload.image_url,
            checkin_time=payload.checkin_time,
            location_text=payload.location_text,
            created_by=current_user.id,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return self._build_record_item(record)

    def list_order_records(self, db: Session, order_id: int, current_user: User) -> list[ServiceRecordItem]:
        order = self._get_order_or_404(db, order_id)
        self._ensure_view_permission(order, current_user)

        records = (
            db.query(ServiceRecord)
            .filter(ServiceRecord.order_id == order_id)
            .order_by(ServiceRecord.checkin_time.asc(), ServiceRecord.id.asc())
            .all()
        )
        return [self._build_record_item(record) for record in records]


service_record_service = ServiceRecordService()

