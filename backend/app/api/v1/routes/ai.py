from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.api.v1.routes.auth import require_roles
from app.models.role import RoleCode
from app.models.user import User
from app.schemas.ai_obligation_analysis import AIObligationAnalysisResponse
from app.services.ai_obligation_analysis import analyze_document


router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
Admin = Annotated[User, Depends(require_roles(RoleCode.ADMIN))]


@router.post("/analyze-obligations", response_model=AIObligationAnalysisResponse)
async def analyze_obligations_document(request: Request, user: Admin) -> AIObligationAnalysisResponse:
    content_type = request.headers.get("content-type", "")
    return analyze_document(
        content=await request.body(),
        content_type=content_type,
        document_name=request.headers.get("x-document-name"),
    )
