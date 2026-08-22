from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.obligations import router as obligations_router
from app.api.v1.routes.controls import router as controls_router
from app.api.v1.routes.evidences import router as evidences_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.reports import router as reports_router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router)
app.include_router(obligations_router)
app.include_router(controls_router)
app.include_router(evidences_router)
app.include_router(dashboard_router)
app.include_router(reports_router)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}
