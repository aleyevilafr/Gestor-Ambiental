from typing import Annotated
from fastapi import APIRouter, Depends
from app.api.v1.routes.auth import require_roles
from app.models.role import RoleCode
from app.models.user import User
from app.schemas.document_analysis import DocumentAnalysisRequest, OrganizationProposal
from app.services.document_analysis import analyze
router=APIRouter(prefix="/api/v1/document-analysis",tags=["document-analysis"])
Admin=Annotated[User,Depends(require_roles(RoleCode.ADMIN))]
@router.post("/extract-organization",response_model=OrganizationProposal)
def extract(payload:DocumentAnalysisRequest,user:Admin)->OrganizationProposal: return analyze(payload)
