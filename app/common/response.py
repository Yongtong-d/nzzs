from typing import Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = "success"
    data: T


def success_response(data: T, message: str = "success") -> ApiResponse[T]:
    return ApiResponse[T](data=data, message=message)
