from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.common.database import init_db
from app.order.router import router as order_router
from app.review.router import router as review_router
from app.role.router import router as role_router
from app.service_record.router import router as service_record_router

app = FastAPI(title="NZZS API", version="1.0.0")
app.include_router(auth_router)
app.include_router(role_router)
app.include_router(order_router)
app.include_router(service_record_router)
app.include_router(review_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/", summary="健康检查")
def healthcheck() -> dict[str, str]:
    return {"message": "ok"}
