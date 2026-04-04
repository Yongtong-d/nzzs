from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.auth import get_current_user
from app.common.database import get_db
from app.role.schema import CurrentRoleResponse, SwitchRoleRequest, SwitchRoleResponse
from app.role.service import role_service
from app.user.model import User

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/current", response_model=CurrentRoleResponse, summary="Get current role")
def get_current_role(current_user: User = Depends(get_current_user)) -> CurrentRoleResponse:
    return role_service.get_current_role(current_user)


@router.put("/current", response_model=SwitchRoleResponse, summary="Switch current role")
def switch_current_role(
    payload: SwitchRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SwitchRoleResponse:
    current_user.role = payload.role.value
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return role_service.switch_role(current_user, payload.role)
