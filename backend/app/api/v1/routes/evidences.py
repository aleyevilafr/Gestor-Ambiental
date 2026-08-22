from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.evidence import CreateEvidenceRequest, EvidenceResponse
from app.services import evidences as service

router = APIRouter(tags=["evidences"])
Db = Annotated[Session, Depends(get_db)]
Current = Annotated[User, Depends(get_current_active_user)]


@router.get("/api/v1/obligations/{obligation_id}/evidences", response_model=list[EvidenceResponse])
def list_evidences(obligation_id: UUID, user: Current, db: Db) -> list[EvidenceResponse]:
    return [service.serialize(item) for item in service.list_evidences(db, user, obligation_id)]


@router.post("/api/v1/obligations/{obligation_id}/evidences", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
def create_evidence(obligation_id: UUID, payload: CreateEvidenceRequest, user: Current, db: Db) -> EvidenceResponse:
    return service.serialize(service.create_evidence(db, user, obligation_id, payload))
