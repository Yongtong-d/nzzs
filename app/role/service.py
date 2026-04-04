from app.common.security import create_access_token
from app.role.schema import CurrentRoleResponse, CurrentRoleUserInfo, SwitchRoleResponse
from app.user.model import User
from app.user.role import UserRole


class RoleService:
    @staticmethod
    def _build_user_info(user: User) -> CurrentRoleUserInfo:
        return CurrentRoleUserInfo(
            id=user.id,
            openid=user.openid,
            nickname=user.nickname,
            avatar=user.avatar,
            role=UserRole(user.role),
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )

    def get_current_role(self, user: User) -> CurrentRoleResponse:
        return CurrentRoleResponse(role=UserRole(user.role), user=self._build_user_info(user))

    def switch_role(self, user: User, target_role: UserRole) -> SwitchRoleResponse:
        user.role = target_role.value
        token = create_access_token(
            subject=str(user.id),
            extra_claims={
                "openid": user.openid,
                "nickname": user.nickname,
                "role": user.role,
            },
        )
        return SwitchRoleResponse(
            access_token=token,
            role=target_role,
            user=self._build_user_info(user),
        )


role_service = RoleService()
