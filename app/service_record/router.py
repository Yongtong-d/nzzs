from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.auth import get_current_user
from app.common.database import get_db
from app.common.response import ApiResponse, success_response
from app.service_record.schema import CreateServiceRecordRequest, ServiceRecordItem
from app.service_record.service import service_record_service
from app.user.model import User

router = APIRouter(tags=["service-records"])


@router.post("/service-records", response_model=ApiResponse[ServiceRecordItem], summary="Create service record")
def create_service_record(
    payload: CreateServiceRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[ServiceRecordItem]:
    return success_response(service_record_service.create_record(db, payload, current_user))


@router.get(
    "/orders/{order_id}/records",
    response_model=ApiResponse[list[ServiceRecordItem]],
    summary="List order service records",
)
def list_order_service_records(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[list[ServiceRecordItem]]:
    return success_response(service_record_service.list_order_records(db, order_id, current_user))
