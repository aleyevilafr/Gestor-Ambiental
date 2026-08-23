from fastapi import HTTPException, status
from app.core.rut import normalize_chilean_rut
from app.integrations.ai_provider import AIProviderUnavailable, extract_organization
from app.schemas.document_analysis import DocumentAnalysisRequest, OrganizationProposal

def analyze(payload: DocumentAnalysisRequest) -> OrganizationProposal:
    if not payload.text.strip(): raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El contenido del documento es obligatorio.")
    try: proposal = extract_organization(payload.text)
    except AIProviderUnavailable as error: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    if proposal.rut:
        try: proposal.rut = normalize_chilean_rut(proposal.rut)
        except ValueError: proposal.rut = None; proposal.warnings.append("El RUT detectado no es válido y fue descartado.")
    return proposal
