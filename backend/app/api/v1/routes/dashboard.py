from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import AttentionObligationResponse, DashboardObligationResponse, DashboardSummaryResponse
from app.services.dashboard import get_attention, get_summary, get_upcoming

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])
Db = Annotated[Session, Depends(get_db)]
Current = Annotated[User, Depends(get_current_active_user)]


@router.get("/summary", response_model=DashboardSummaryResponse)
def summary(user: Current, db: Db) -> DashboardSummaryResponse:
    return get_summary(db, user)

@router.get("/attention", response_model=list[AttentionObligationResponse])
def attention(user: Current, db: Db): return get_attention(db, user)

@router.get("/upcoming", response_model=list[DashboardObligationResponse])
def upcoming(user: Current, db: Db): return get_upcoming(db, user)
