from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.auth import get_current_user
from app.common.database import get_db
from app.common.response import ApiResponse, success_response
from app.order.schema import CancelOrderRequest, CreateOrderRequest, OrderDetail, OrderSummary
from app.order.service import order_service
from app.user.model import User

router = APIRouter(prefix='/orders', tags=['orders'])


@router.post('', response_model=ApiResponse[OrderDetail], summary='创建订单')
def create_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[OrderDetail]:
    return success_response(order_service.create_order(db, payload, current_user))


@router.get('/hall', response_model=ApiResponse[list[OrderSummary]], summary='订单大厅')
def list_hall_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[list[OrderSummary]]:
    return success_response(order_service.list_hall_orders(db))


@router.get('/my/published', response_model=ApiResponse[list[OrderSummary]], summary='我发布的订单')
def list_my_published_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[list[OrderSummary]]:
    return success_response(order_service.list_my_published_orders(db, current_user))


@router.get('/my/taken', response_model=ApiResponse[list[OrderSummary]], summary='我接的订单')
def list_my_taken_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[list[OrderSummary]]:
    return success_response(order_service.list_my_taken_orders(db, current_user))


@router.get('/{order_id}', response_model=ApiResponse[OrderDetail], summary='订单详情')
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[OrderDetail]:
    return success_response(order_service.get_order_detail(db, order_id))


@router.post('/{order_id}/accept', response_model=ApiResponse[OrderDetail], summary='喂养者接单')
def accept_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[OrderDetail]:
    return success_response(order_service.accept_order(db, order_id, current_user))


@router.post('/{order_id}/start', response_model=ApiResponse[OrderDetail], summary='开始服务')
def start_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[OrderDetail]:
    return success_response(order_service.start_order(db, order_id, current_user))


@router.post('/{order_id}/finish', response_model=ApiResponse[OrderDetail], summary='完成订单')
def finish_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[OrderDetail]:
    return success_response(order_service.finish_order(db, order_id, current_user))


@router.post('/{order_id}/cancel', response_model=ApiResponse[OrderDetail], summary='取消订单')
def cancel_order(
    order_id: int,
    payload: CancelOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[OrderDetail]:
    return success_response(order_service.cancel_order(db, order_id, payload, current_user))
