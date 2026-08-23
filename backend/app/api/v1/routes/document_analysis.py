from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import require_roles
from app.db.session import get_db
from app.models.role import RoleCode
from app.models.user import User
from app.schemas.company_profile import CompanyProfileExtractionResult, CompanyProfileResponse, CompanyProfileUpdateRequest
from app.schemas.document_analysis import DocumentAnalysisRequest, OrganizationProposal
from app.services.document_analysis import analyze, analyze_company_profile, update_company_profile
from app.services.pdf_text_extraction import extract_pdf_text

router = APIRouter(prefix="/api/v1/document-analysis", tags=["document-analysis"])
Admin = Annotated[User, Depends(require_roles(RoleCode.ADMIN))]
Db = Annotated[Session, Depends(get_db)]


@router.post("/extract-organization", response_model=OrganizationProposal)
def extract(payload: DocumentAnalysisRequest, user: Admin) -> OrganizationProposal:
    return analyze(payload)


@router.post("/extract-company-profile", response_model=CompanyProfileExtractionResult)
async def extract_company_profile(request: Request, user: Admin) -> CompanyProfileExtractionResult:
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    if content_type != "application/pdf":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Solo se aceptan archivos PDF.")
    return analyze_company_profile(extract_pdf_text(await request.body()))


@router.patch("/company-profile", response_model=CompanyProfileResponse)
def save_company_profile(payload: CompanyProfileUpdateRequest, user: Admin, db: Db) -> CompanyProfileResponse:
    response = update_company_profile(user.organization, payload)
    db.commit()
    return response
