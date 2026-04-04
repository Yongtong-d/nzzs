from enum import Enum


class UserRole(str, Enum):
    OWNER = "owner"
    FEEDER = "feeder"


AVAILABLE_USER_ROLES = [UserRole.OWNER, UserRole.FEEDER]
