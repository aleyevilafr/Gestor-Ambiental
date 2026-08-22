from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard import get_summary

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])
Db = Annotated[Session, Depends(get_db)]
Current = Annotated[User, Depends(get_current_active_user)]


@router.get("/summary", response_model=DashboardSummaryResponse)
def summary(user: Current, db: Db) -> DashboardSummaryResponse:
    return get_summary(db, user)
