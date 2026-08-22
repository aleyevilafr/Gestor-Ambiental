from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.role import RoleCode
from app.models.user import User
from app.repositories.controls import get_for_obligation
from app.repositories.evidences import list_for_obligation
from app.schemas.evidence import CreateEvidenceRequest, EvidenceResponse, UploadedByUserResponse
from app.services.obligations import get as get_obligation


def serialize(evidence: Evidence) -> EvidenceResponse:
    uploader = evidence.uploaded_by_user
    return EvidenceResponse(id=evidence.id, obligation_id=evidence.obligation_id, control_id=evidence.control_id, name=evidence.name, description=evidence.description, evidence_type=evidence.evidence_type, file_url=evidence.file_url, external_url=evidence.external_url, uploaded_by_user_id=evidence.uploaded_by_user_id, uploaded_by_user=UploadedByUserResponse(id=uploader.id, name=uploader.name, email=uploader.email), created_at=evidence.created_at)


def list_evidences(db: Session, user: User, obligation_id: UUID) -> list[Evidence]:
    get_obligation(db, user, obligation_id)
    return list_for_obligation(db, obligation_id)


def create_evidence(db: Session, user: User, obligation_id: UUID, payload: CreateEvidenceRequest) -> Evidence:
    obligation = get_obligation(db, user, obligation_id)
    if user.role.code == RoleCode.READER:
        raise HTTPException(403, "No tienes permisos para registrar evidencias.")
    if payload.control_id and not get_for_obligation(db, obligation.id, payload.control_id):
        raise HTTPException(422, "El control debe pertenecer a esta obligación.")
    evidence = Evidence(obligation_id=obligation.id, control_id=payload.control_id, name=payload.name.strip(), description=payload.description, evidence_type=payload.evidence_type, file_url=payload.file_url, external_url=payload.external_url, uploaded_by_user_id=user.id)
    db.add(evidence)
    db.commit()
    db.refresh(evidence, attribute_names=["uploaded_by_user"])
    return evidence
