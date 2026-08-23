from fastapi import HTTPException, status
from app.core.rut import normalize_chilean_rut
from datetime import date

from app.integrations.ai_provider import AIProviderUnavailable, extract_company_profile, extract_organization
from app.models.organization import Organization
from app.schemas.company_profile import CompanyProfileExtractionResult, CompanyProfileUpdateRequest, CompanyProfileResponse
from app.schemas.document_analysis import DocumentAnalysisRequest, OrganizationProposal

def analyze(payload: DocumentAnalysisRequest) -> OrganizationProposal:
    if not payload.text.strip(): raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El contenido del documento es obligatorio.")
    try: proposal = extract_organization(payload.text)
    except AIProviderUnavailable as error: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    if proposal.rut:
        try: proposal.rut = normalize_chilean_rut(proposal.rut)
        except ValueError: proposal.rut = None; proposal.warnings.append("El RUT detectado no es válido y fue descartado.")
    return proposal


def analyze_company_profile(text: str) -> CompanyProfileExtractionResult:
    try:
        proposal = extract_company_profile(text)
    except AIProviderUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    if proposal.rut:
        try:
            proposal.rut = normalize_chilean_rut(proposal.rut)
        except ValueError:
            proposal.rut = None
            proposal.warnings.append("El RUT detectado no es válido y fue descartado.")
    for field, label in (("incorporation_date", "La fecha de constitución"), ("document_date", "La fecha del documento")):
        value = getattr(proposal, field)
        if value:
            try:
                date.fromisoformat(value)
            except ValueError:
                setattr(proposal, field, None)
                proposal.warnings.append(f"{label} no es válida y fue descartada.")
    if proposal.legal_representatives:
        proposal.warnings.append("Los representantes detectados no acreditan necesariamente su vigencia actual.")
    proposal.warnings = proposal.warnings[:10]
    return proposal


def update_company_profile(organization: Organization, payload: CompanyProfileUpdateRequest) -> CompanyProfileResponse:
    try:
        organization.rut = normalize_chilean_rut(payload.rut)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    organization.name = payload.name
    organization.company_type = payload.company_type
    organization.business_purpose = payload.business_purpose
    organization.address = payload.address
    return CompanyProfileResponse(name=organization.name, rut=organization.rut, company_type=organization.company_type, business_purpose=organization.business_purpose, address=organization.address)
